export const CONSENT_VERSION='versenest-updates-v1';
export const CONSENT_TEXT='Send me VerseNest tips and updates by email. I can unsubscribe in my account settings at any time.';
export interface ParentProfile {name:string;email:string;marketingOptIn:boolean;consentAt:string|null;createdAt:string;updatedAt:string}
export interface AccountInfo {userId:string;email:string;isOwner:boolean;profile:ParentProfile|null}
export interface ParentRow extends ParentProfile {userId:string}
