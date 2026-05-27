export const REGEX = {
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).*$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PINCODE_REGEX: /^[A-Za-z0-9][A-Za-z0-9\s-]{2,19}$/,
  PHONE_REGEX: /^[0-9+\-()\s]{7,20}$/,
};
