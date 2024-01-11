export const patternValidationFactory = (
  pattern: RegExp,
  options?: { required?: boolean },
) => {
  return validationFactory(RegExp.prototype.test.bind(pattern), options);
};

export const validationFactory = (
  subValidate: (value: string) => boolean,
  options?: { required?: boolean },
) => {
  const isOptional = options?.required !== true;
  return (value: string) => subValidate(value) || (isOptional && value === '');
};

// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string
export const digestMessage = async (
  message: string,
  options?: { algorithm?: string },
) => {
  const { algorithm = 'SHA-1' } = options ?? {};
  const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest(algorithm, msgUint8); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(''); // convert bytes to hex string
  return hashHex;
};

export const randomId = async (options?: {
  salt?: string;
  maxLength?: number;
  message?: string;
  algorithm?: string;
}) => {
  const {
    salt = Date.now().toString(),
    maxLength = Infinity,
    message = '',
  } = options ?? {};
  const hash = await digestMessage(`${salt} ${message}`, options);
  return hash.slice(0, maxLength);
};
