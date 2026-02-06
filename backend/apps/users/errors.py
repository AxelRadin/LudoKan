class UserErrors:
    # Conflits d'identité
    EMAIL_ALREADY_EXISTS = "Cet email est déjà enregistré."
    PSEUDO_ALREADY_EXISTS = "Ce pseudo est déjà pris."

    # Mots de passe
    PASSWORD_TOO_SHORT = "Le mot de passe doit contenir au moins 8 caractères."  # NOSONAR - message d'erreur, pas un mot de passe
    PASSWORD_MISMATCH = "Les deux mots de passe ne correspondent pas."  # NOSONAR - message d'erreur, pas un mot de passe

    # Authentification
    AUTH_INVALID_CREDENTIALS = "Email ou mot de passe incorrect."  # NOSONAR - message d'erreur, pas un mot de passe

    # Avatar / upload
    AVATAR_TOO_LARGE = "La taille du fichier ne doit pas dépasser 2 Mo."
    AVATAR_INVALID_FORMAT = "Format non supporté. Formats acceptés : jpg, jpeg, png, webp."

    # Sécurité
    RECAPTCHA_INVALID = "Validation reCAPTCHA échouée."
