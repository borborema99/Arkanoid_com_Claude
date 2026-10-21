from django.shortcuts import render


def index(request):
    # Mostra a página do jogo
    return render(request, "jogo/index.html")
