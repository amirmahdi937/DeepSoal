from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import render
from .models import Question, Answer, UserProfile, Category, UserActivity
from .serializers import (QuestionSerializer, AnswerSerializer, UserSerializer,
                         UserProfileSerializer, CategorySerializer, UserActivitySerializer,
                         StatsSerializer)

# Viewهای اصلی
class ActiveQuestionView(generics.RetrieveAPIView):
    serializer_class = QuestionSerializer
    permission_classes = [AllowAny]
    
    def get_object(self):
        try:
            return Question.objects.get(is_active=True)
        except Question.DoesNotExist:
            return None

class AnswerListCreateView(generics.ListCreateAPIView):
    serializer_class = AnswerSerializer
    
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated()]
        return [AllowAny()]
    
    def get_queryset(self):
        active_question = Question.objects.filter(is_active=True).first()
        if active_question:
            return Answer.objects.filter(question=active_question).select_related(
                'user', 'question'
            ).prefetch_related('likes').order_by('-created_at')
        return Answer.objects.none()

    def perform_create(self, serializer):
        active_question = Question.objects.filter(is_active=True).first()
        if active_question:
            answer = serializer.save(user=self.request.user, question=active_question)
            # ثبت فعالیت کاربر
            UserActivity.objects.create(
                user=self.request.user,
                activity_type='answer',
                details=f'پاسخ به سوال: {active_question.question_text[:50]}...'
            )
        else:
            from rest_framework import serializers
            raise serializers.ValidationError("هیچ سوال فعالی وجود ندارد")

class AnswerLikeView(generics.UpdateAPIView):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer
    permission_classes = [IsAuthenticated]

    def update(self, request, *args, **kwargs):
        answer = self.get_object()
        user = request.user
        
        if user in answer.likes.all():
            answer.likes.remove(user)
            liked = False
        else:
            answer.likes.add(user)
            liked = True
            
        # ثبت فعالیت کاربر
        UserActivity.objects.create(
            user=request.user,
            activity_type='like',
            details=f'لایک پاسخ کاربر {answer.user.username}'
        )
        
        return Response({
            'status': 'success',
            'liked': liked,
            'total_likes': answer.total_likes()
        })

# سیستم جستجو
class AnswerSearchView(generics.ListAPIView):
    serializer_class = AnswerSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ['answer_text', 'user__username', 'question__question_text']

    def get_queryset(self):
        queryset = Answer.objects.all().select_related('user', 'question').prefetch_related('likes')
        
        # فیلتر بر اساس کاربر
        user_id = self.request.GET.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
            
        # فیلتر بر اساس سوال
        question_id = self.request.GET.get('question_id')
        if question_id:
            queryset = queryset.filter(question_id=question_id)
            
        return queryset.order_by('-created_at')

# سیستم آمار و آنالیز
class StatsView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        # محاسبه آمار
        total_users = User.objects.count()
        total_questions = Question.objects.count()
        total_answers = Answer.objects.count()
        total_likes = Answer.objects.aggregate(total_likes=Count('likes'))['total_likes'] or 0
        
        # کاربران فعال امروز
        today = timezone.now().date()
        active_users_today = UserActivity.objects.filter(
            timestamp__date=today
        ).values('user').distinct().count()
        
        stats = {
            'total_users': total_users,
            'total_questions': total_questions,
            'total_answers': total_answers,
            'total_likes': total_likes,
            'active_users_today': active_users_today
        }
        
        serializer = StatsSerializer(stats)
        return Response(serializer.data)

# پروفایل کاربر
class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile

class PublicUserProfileView(generics.RetrieveAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [AllowAny]
    queryset = UserProfile.objects.all()

# مدیریت دسته‌بندی‌ها
class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    queryset = Category.objects.all()

# سیستم ثبت‌نام و لاگین - نسخه اصلاح شده
@api_view(['POST'])
@permission_classes([AllowAny])
def custom_register_view(request):
    try:
        # دریافت داده‌ها از فرم
        username = request.data.get('username')
        email = request.data.get('email')
        password1 = request.data.get('password1')
        password2 = request.data.get('password2')
        
        print(f"📝 Register attempt - Username: {username}, Email: {email}")  # برای دیباگ
        
        # اعتبارسنجی
        if not username or not email or not password1 or not password2:
            return Response({
                'success': False,
                'error': 'تمامی فیلدها الزامی هستند'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if password1 != password2:
            return Response({
                'success': False,
                'error': 'رمز عبور و تکرار آن مطابقت ندارند'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(password1) < 6:
            return Response({
                'success': False,
                'error': 'رمز عبور باید حداقل ۶ کاراکتر باشد'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(username=username).exists():
            return Response({
                'success': False,
                'error': 'این نام کاربری قبلاً ثبت شده است'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(email=email).exists():
            return Response({
                'success': False,
                'error': 'این ایمیل قبلاً ثبت شده است'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # ایجاد کاربر
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password1
        )
        
        # ایجاد پروفایل
        UserProfile.objects.create(user=user)
        
        # لاگین خودکار
        login(request, user)
        
        # ثبت فعالیت
        UserActivity.objects.create(
            user=user,
            activity_type='register',
            details='ثبت‌نام در سایت'
        )
        
        print(f"✅ Register successful - User ID: {user.id}")  # برای دیباگ
        
        return Response({
            'success': True,
            'message': 'ثبت‌نام موفقیت‌آمیز بود!',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"❌ Register error: {str(e)}")  # برای دیباگ
        return Response({
            'success': False,
            'error': f'خطا در ثبت‌نام: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def custom_login_view(request):
    try:
        # دریافت داده‌ها از فرم
        username = request.data.get('username')
        password = request.data.get('password')
        
        print(f"🔑 Login attempt - Username: {username}")  # برای دیباگ
        
        if not username or not password:
            return Response({
                'success': False,
                'error': 'نام کاربری و رمز عبور الزامی هستند'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = authenticate(username=username, password=password)
        
        if user is not None:
            if user.is_active:
                login(request, user)
                
                # ثبت فعالیت
                UserActivity.objects.create(
                    user=user,
                    activity_type='login',
                    details='ورود به سایت'
                )
                
                print(f"✅ Login successful - User ID: {user.id}")  # برای دیباگ
                
                return Response({
                    'success': True,
                    'message': 'ورود موفقیت‌آمیز بود!',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email
                    }
                })
            else:
                return Response({
                    'success': False,
                    'error': 'حساب کاربری غیرفعال است'
                }, status=status.HTTP_401_UNAUTHORIZED)
        else:
            return Response({
                'success': False,
                'error': 'نام کاربری یا رمز عبور اشتباه است'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
    except Exception as e:
        print(f"❌ Login error: {str(e)}")  # برای دیباگ
        return Response({
            'success': False,
            'error': f'خطا در ورود: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def custom_logout_view(request):
    try:
        if request.user.is_authenticated:
            # ثبت فعالیت
            UserActivity.objects.create(
                user=request.user,
                activity_type='logout',
                details='خروج از سایت'
            )
            print(f"🚪 Logout - User: {request.user.username}")  # برای دیباگ
        
        logout(request)
        return Response({
            'success': True, 
            'message': 'خروج موفقیت‌آمیز بود'
        })
    except Exception as e:
        print(f"❌ Logout error: {str(e)}")  # برای دیباگ
        return Response({
            'success': False,
            'error': 'خطا در خروج'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def current_user_view(request):
    try:
        if request.user.is_authenticated:
            return Response({
                'authenticated': True,
                'user': {
                    'id': request.user.id,
                    'username': request.user.username,
                    'email': request.user.email
                }
            })
        return Response({'authenticated': False})
    except Exception as e:
        print(f"❌ Current user error: {str(e)}")  # برای دیباگ
        return Response({
            'authenticated': False,
            'error': 'خطا در دریافت اطلاعات کاربر'
        })

# سیستم کاربران
class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
    queryset = User.objects.all()

# فعالیت‌های کاربر
class UserActivityView(generics.ListAPIView):
    serializer_class = UserActivitySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserActivity.objects.filter(user=self.request.user).order_by('-timestamp')

# صفحه اصلی
def index(request):
    return render(request, 'core/index.html')

# تست سلامت API
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        'status': 'healthy',
        'timestamp': timezone.now(),
        'version': '1.0.0'
    })

# ایجاد کاربر تست (برای توسعه)
@api_view(['POST'])
@permission_classes([AllowAny])
def create_test_user(request):
    try:
        # ایجاد کاربر تست
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='test123456'
        )
        
        UserProfile.objects.create(user=user)
        
        return Response({
            'success': True,
            'message': 'کاربر تست ایجاد شد',
            'user': {
                'username': 'testuser',
                'password': 'test123456'
            }
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
