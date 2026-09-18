const validateLogin = (data) => {
  const errors = {};

  const { email, password } = data;

  if (!email || !email.trim()) {
    errors.email = "Email is required";
  }

  if (!password || !password.trim()) {
    errors.password = "Password is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

module.exports = validateLogin;