// API Client for backend communication
const API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? ""
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const defaultHeaders = {
  "Content-Type": "application/json",
};

const apiFetch = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: { ...defaultHeaders, ...options.headers },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || "Request failed",
      };
    }

    return { success: true, data: data.data || data, ...data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
};

// Properties API
export const propertiesAPI = {
  async getProperties(): Promise<ApiResponse> {
    return apiFetch("/api/properties");
  },

  async getProperty(id: string): Promise<ApiResponse> {
    return apiFetch(`/api/properties/${id}`);
  },

  async createProperty(formData: FormData): Promise<ApiResponse> {
    return apiFetch("/api/properties", {
      method: "POST",
      body: formData,
      headers: {}, // Remove Content-Type header to let browser set it for FormData
    });
  },
};

// OTP API
export const otpAPI = {
  async sendOTP(email: string): Promise<ApiResponse> {
    return apiFetch("/api/otp/send", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async verifyOTP(email: string, otp: string): Promise<ApiResponse> {
    return apiFetch("/api/otp/verify", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  },

  async sendOTPSMS(phone: string): Promise<ApiResponse> {
    return apiFetch("/api/otp/send-sms", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  },

  async verifyOTPSMS(phone: string, otp: string): Promise<ApiResponse> {
    return apiFetch("/api/otp/verify-sms", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    });
  },
};

// Auth API
export const authAPI = {
  async login(email: string, password: string): Promise<ApiResponse> {
    return apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async getUser(userId: string): Promise<ApiResponse> {
    return apiFetch(`/api/auth/user?userId=${userId}`);
  },
};

// Password API
export const passwordAPI = {
  async sendPasswordResetOTP(email: string): Promise<ApiResponse> {
    return apiFetch("/api/auth/password-reset", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async verifyPasswordResetOTP(
    email: string,
    otp: string
  ): Promise<ApiResponse> {
    return apiFetch("/api/auth/verify-password-reset", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  },

  async resetPassword(
    email: string,
    resetToken: string,
    newPassword: string
  ): Promise<ApiResponse> {
    return apiFetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, resetToken, newPassword }),
    });
  },
};

// Utility API
export const utilityAPI = {
  async testConnection(): Promise<ApiResponse> {
    return apiFetch("/api/test-connection");
  },
};
