#requires -Version 7.2
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Archive,
    [Parameter(Mandatory)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedSha256,
    [ValidateSet('Validate', 'DryRun', 'Apply')][string]$Mode = 'Validate',
    [switch]$QuarantineRetained
)

$ErrorActionPreference = 'Stop'
$process = $null
$plaintext = $null
$stage = 'opening the archive'
$failed = $false
try {
    if (-not $IsWindows) { throw 'Windows DPAPI is required.' }
    if ($QuarantineRetained -and $Mode -ne 'Apply') { throw 'Quarantine confirmation is only used for Apply.' }
    $file = Get-Item -LiteralPath $Archive
    if ($file -isnot [IO.FileInfo] -or $file.Length -lt 1 -or $file.Length -gt 96MB) {
        throw 'Invalid archive size.'
    }
    $ciphertext = [IO.File]::ReadAllBytes($file.FullName)
    $digest = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($ciphertext))
    if ($digest -ine $ExpectedSha256) { throw 'Archive checksum mismatch.' }
    $stage = 'decrypting with this Windows user'
    $plaintext = [Security.Cryptography.ProtectedData]::Unprotect(
        $ciphertext, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser
    )

    $stage = 'validating or importing the archive'
    $entry = if ($Mode -eq 'Validate') { 'softr-history.mjs' } else { 'import-softr-history.mjs' }
    $utf8 = [Text.UTF8Encoding]::new($false)
    $node = Get-Command node -CommandType Application | Select-Object -First 1
    $start = [Diagnostics.ProcessStartInfo]::new($node.Source)
    $start.UseShellExecute = $false
    $start.RedirectStandardInput = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $start.StandardInputEncoding = $utf8
    $start.StandardOutputEncoding = $utf8
    $start.StandardErrorEncoding = $utf8
    $start.ArgumentList.Add((Join-Path $PSScriptRoot $entry))
    if ($Mode -eq 'Apply') { $start.ArgumentList.Add('--apply') }
    if ($QuarantineRetained) { $start.ArgumentList.Add('--quarantine-retained') }
    $process = [Diagnostics.Process]::Start($start)
    $output = $process.StandardOutput.ReadToEndAsync()
    $errors = $process.StandardError.ReadToEndAsync()
    try {
        $process.StandardInput.BaseStream.Write($plaintext, 0, $plaintext.Length)
    } finally {
        $process.StandardInput.Close()
    }
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) {
        $diagnostic = $errors.GetAwaiter().GetResult()
        if ($diagnostic -match '\bSQLSTATE ([0-9A-Z]{5})\b') {
            [Console]::Error.WriteLine('Import rolled back. SQLSTATE ' + $Matches[1] + '.')
        }
        throw 'Archive validation or import failed.'
    }
    [Console]::Write($output.GetAwaiter().GetResult())
} catch {
    [Console]::Error.WriteLine("CP Retail archive restore failed while $stage.")
    $failed = $true
} finally {
    if ($null -ne $process) { $process.Dispose() }
    if ($null -ne $plaintext) { [Array]::Clear($plaintext, 0, $plaintext.Length) }
}
if ($failed) { exit 1 }
