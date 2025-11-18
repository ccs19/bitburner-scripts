

type NullableString = string | null | undefined;

export function isBlank(str: NullableString): boolean {
  if(typeof str === 'number') {
    return false;
  }
  
  return !str || str.trim().length === 0;  
}

export function isNotBlank(str: NullableString): boolean {
  return !isBlank(str);
}