from django.urls import path
from . import views

urlpatterns = [
    path('', views.index),
    path('api/question/', views.get_question),
    path('api/answers/', views.get_answers),
    path('api/answers/add/', views.add_answer),
    path('api/answers/<int:answer_id>/like/', views.like_answer),
]
