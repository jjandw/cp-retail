import React from 'react';

export function BrandLogo() {
  return <img className="cp-brand-lockup" src="/cp-retail-logo.png" alt="CP Retail" width="216" height="72" />;
}

export function BrandIcon({size=34,className=''}:{size?:number;className?:string}) {
  return <img className={'brand-logo '+className} src="/cp-retail-icon.png" alt="" aria-hidden="true" width={size} height={size} style={{objectFit:'contain',borderRadius:6,flexShrink:0}} />;
}
