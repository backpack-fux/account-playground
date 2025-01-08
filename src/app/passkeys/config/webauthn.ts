// For local development, use localhost
const hostname = "localhost";
const port = "3001";
const protocol = "http:";

export const rpName = "Safe Passkeys Demo";
export const rpID = hostname;
export const expectedOrigin = `${protocol}//${hostname}${
  port ? `:${port}` : ""
}`;

// Options for the authenticator
export const authenticatorOptions = {
  authenticatorAttachment: "platform" as const,
  requireResidentKey: true,
  residentKey: "required" as const,
  userVerification: "preferred" as const,
};

// Registration options
export const registrationTimeout = 60000;

// Authentication options
export const authenticationTimeout = 60000;
