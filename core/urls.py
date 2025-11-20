from django.urls import path
from . import views

urlpatterns = [
    # صفحه اصلی
    path('', views.index, name='index'),
    
    # APIهای اصلی
    path('api/active-question/', views.ActiveQuestionView.as_view(), name='active-question'),
    path('api/answers/', views.AnswerListCreateView.as_view(), name='answer-list'),
    path('api/answers/<int:pk>/like/', views.AnswerLikeView.as_view(), name='answer-like'),
    path('api/all-answers/', views.AllAnswersView.as_view(), name='all-answers'),
    
    # جستجو و آمار
    path('api/search/', views.AnswerSearchView.as_view(), name='search'),
    path('api/stats/', views.StatsView.as_view(), name='stats'),
    
    # دسته‌بندی‌ها
    path('api/categories/', views.CategoryListView.as_view(), name='categories'),
    
    # سلامت
    path('api/health/', views.health_check, name='health-check'),
]
