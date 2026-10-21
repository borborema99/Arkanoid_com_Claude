# Configuração mínima: o jogo é estático, sem banco, sem login
import os
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "chave-so-para-desenvolvimento")
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = os.environ.get("DJANGO_HOSTS", "localhost,127.0.0.1").split(",")
INSTALLED_APPS = ["django.contrib.staticfiles", "jogo"]
MIDDLEWARE = []
ROOT_URLCONF = "config.urls"
TEMPLATES = [{"BACKEND": "django.template.backends.django.DjangoTemplates", "APP_DIRS": True}]
DATABASES = {}
LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Recife"
STATIC_URL = "static/"
