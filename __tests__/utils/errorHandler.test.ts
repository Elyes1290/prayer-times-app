import { getErrorMessageKey, getErrorTitleKey } from "../../utils/errorHandler";

describe("ErrorHandler", () => {
  describe("getErrorMessageKey", () => {
    it("should handle authentication errors correctly", () => {
      const error = new Error("Mot de passe incorrect");
      const result = getErrorMessageKey(error);

      expect(result).toBe("errors.authentication.invalid_credentials");
    });

    it("should handle user not found errors", () => {
      const error = new Error("Utilisateur non trouvé");
      const result = getErrorMessageKey(error);

      expect(result).toBe("errors.authentication.user_not_found");
    });

    it("should handle validation errors correctly", () => {
      const error = new Error("Email requis");
      const result = getErrorMessageKey(error);

      expect(result).toBe("errors.validation.email_required");
    });

    it("should handle HTTP 401 errors", () => {
      const error = new Error("HTTP 401: Unauthorized");
      const result = getErrorMessageKey(error);

      expect(result).toBe("errors.authentication.invalid_credentials");
    });

    it("should handle HTTP 400 errors", () => {
      const error = new Error("HTTP 400: Bad Request");
      const result = getErrorMessageKey(error);

      expect(result).toBe("errors.http.400");
    });

    it("should handle HTTP 500 errors", () => {
      const error = new Error("HTTP 500: Internal Server Error");
      const result = getErrorMessageKey(error);

      expect(result).toBe("errors.http.500");
    });

    it("should handle network errors", () => {
      const error = new Error("Network error");
      const result = getErrorMessageKey(error);

      expect(result).toBe("errors.network.connection_error");
    });

    it("should handle timeout errors", () => {
      const error = new Error("Timeout");
      const result = getErrorMessageKey(error);

      expect(result).toBe("errors.network.timeout");
    });

    it("should handle JSON parsing errors", () => {
      const error = new Error("Invalid JSON response");
      const result = getErrorMessageKey(error);

      expect(result).toBe("errors.technical.communication_error");
    });

    it("should handle account already exists errors", () => {
      const error = new Error("Compte existe déjà");
      const result = getErrorMessageKey(error);

      expect(result).toBe("errors.validation.account_exists");
    });

    it("should handle password validation errors", () => {
      const error = new Error(
        "Mot de passe doit contenir au moins 8 caractères"
      );
      const result = getErrorMessageKey(error);

      expect(result).toBe("errors.validation.password_criteria");
    });

    it("should handle same password errors", () => {
      const error = new Error(
        "Nouveau mot de passe ne peut pas être identique"
      );
      const result = getErrorMessageKey(error);

      expect(result).toBe("errors.validation.same_password");
    });

    it("should handle null/undefined errors", () => {
      const result = getErrorMessageKey(null);

      expect(result).toBe("errors.unknown_error");
    });

    it("should use custom API message when available", () => {
      const error = new Error("Erreur personnalisée de l'API");
      const result = getErrorMessageKey(error);

      expect(result).toBe("Erreur personnalisée de l'API");
    });

    it("should handle case insensitive error messages", () => {
      const error = new Error("MOT DE PASSE INCORRECT");
      const result = getErrorMessageKey(error);

      expect(result).toBe("errors.authentication.invalid_credentials");
    });
  });

  describe("getErrorTitleKey", () => {
    it("should return authentication title for auth errors", () => {
      const error = new Error("Mot de passe incorrect");
      const result = getErrorTitleKey(error);

      expect(result).toBe("errors.authentication.title");
    });

    it("should return validation title for validation errors", () => {
      const error = new Error("Email requis");
      const result = getErrorTitleKey(error);

      expect(result).toBe("errors.validation.title");
    });

    it("should return network title for network errors", () => {
      const error = new Error("Network error");
      const result = getErrorTitleKey(error);

      expect(result).toBe("errors.network.title");
    });

    it("should return server title for server errors", () => {
      const error = new Error("HTTP 500: Internal Server Error");
      const result = getErrorTitleKey(error);

      expect(result).toBe("errors.server.title");
    });

    it("should return technical title for technical errors", () => {
      const error = new Error("Invalid JSON response");
      const result = getErrorTitleKey(error);

      expect(result).toBe("errors.technical.title");
    });

    it("should return validation title for null/undefined errors", () => {
      const result = getErrorTitleKey(null);

      expect(result).toBe("errors.validation.title");
    });
  });
});
