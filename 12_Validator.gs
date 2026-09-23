/**
 * Validator Module
 * Centralized validation logic
 */
const Validator = {
  validate: function(data, rules) {
    const errors = {};
    let isValid = true;

    for (const field in rules) {
      const fieldRules = rules[field];
      const value = data[field];

      if (fieldRules.required && (value === undefined || value === null || value === '')) {
        errors[field] = `${field} is required`;
        isValid = false;
        continue;
      }
      
      if (value !== undefined && value !== null && value !== '') {
        if (fieldRules.type === 'string' && typeof value !== 'string') {
          errors[field] = `${field} must be a string`;
          isValid = false;
        }
        
        if (fieldRules.type === 'number' && isNaN(Number(value))) {
          errors[field] = `${field} must be a number`;
          isValid = false;
        }

        if (fieldRules.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors[field] = `${field} must be a valid email`;
            isValid = false;
          }
        }
        
        if (fieldRules.minLength && typeof value === 'string' && value.length < fieldRules.minLength) {
          errors[field] = `${field} must be at least ${fieldRules.minLength} characters`;
          isValid = false;
        }
        
        if (fieldRules.maxLength && typeof value === 'string' && value.length > fieldRules.maxLength) {
          errors[field] = `${field} must be at most ${fieldRules.maxLength} characters`;
          isValid = false;
        }
        
        if (fieldRules.min !== undefined && Number(value) < fieldRules.min) {
          errors[field] = `${field} must be at least ${fieldRules.min}`;
          isValid = false;
        }
        
        if (fieldRules.max !== undefined && Number(value) > fieldRules.max) {
          errors[field] = `${field} must be at most ${fieldRules.max}`;
          isValid = false;
        }
      }
    }

    return {
      isValid: isValid,
      errors: errors
    };
  }
};
