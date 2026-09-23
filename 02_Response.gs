/**
 * Standardized Response Format
 */
const Response = {
  success: function(data = null, message = "Success") {
    return {
      success: true,
      data: data,
      message: message
    };
  },
  
  error: function(message = "Error", errors = {}) {
    return {
      success: false,
      data: null,
      message: message,
      errors: errors
    };
  }
};
