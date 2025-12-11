class UserErrors:
    # Conflits d'identité
    EMAIL_ALREADY_EXISTS = "Cet email est déjà enregistré."
    PSEUDO_ALREADY_EXISTS = "Ce pseudo est déjà pris."

    # Mots de passe
    PASSWORD_TOO_SHORT = "Le mot de passe doit contenir au moins 8 caractères."
    PASSWORD_MISMATCH = "Les deux mots de passe ne correspondent pas."

    # Authentification
    AUTH_INVALID_CREDENTIALS = "Email ou mot de passe incorrect."

    # Avatar / upload
    AVATAR_TOO_LARGE = "La taille du fichier ne doit pas dépasser 2 Mo."
    AVATAR_INVALID_FORMAT = "Format non supporté. Formats acceptés : jpg, jpeg, png, webp."

    # Sécurité
    RECAPTCHA_INVALID = "Validation reCAPTCHA échouée."





