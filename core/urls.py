from django.urls import path, include
from . import views

urlpatterns = [
    # صفحه اصلی
    path('', views.index, name='index'),
    
    # APIهای اصلی
    path('api/active-question/', views.ActiveQuestionView.as_view(), name='active-question'),
    path('api/answers/', views.AnswerListCreateView.as_view(), name='answer-list'),
    path('api/answers/<int:pk>/like/', views.AnswerLikeView.as_view(), name='answer-like'),
    
    # سیستم احراز هویت
    path('api/auth/register/', views.custom_register_view, name='register'),
    path('api/auth/login/', views.custom_login_view, name='login'),
    path('api/auth/logout/', views.custom_logout_view, name='logout'),
    path('api/auth/user/', views.current_user_view, name='current-user'),
    
    # پروفایل کاربران
    path('api/profile/', views.UserProfileView.as_view(), name='my-profile'),
    path('api/profile/<int:pk>/', views.PublicUserProfileView.as_view(), name='public-profile'),
    
    # جستجو و آمار
    path('api/search/', views.AnswerSearchView.as_view(), name='search'),
    path('api/stats/', views.StatsView.as_view(), name='stats'),
    
    # دسته‌بندی‌ها
    path('api/categories/', views.CategoryListView.as_view(), name='categories'),
    
    # کاربران و فعالیت‌ها
    path('api/users/', views.UserListView.as_view(), name='users'),
    path('api/activities/', views.UserActivityView.as_view(), name='activities'),
    
    # ابزارهای توسعه
    path('api/health/', views.health_check, name='health-check'),
    path('api/create-test-user/', views.create_test_user, name='create-test-user'),
]
