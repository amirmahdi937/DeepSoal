from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.shortcuts import render
from .models import Question, Answer, UserProfile
from .serializers import QuestionSerializer, AnswerSerializer, UserSerializer

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
            return Answer.objects.filter(question=active_question).order_by('-created_at')
        return Answer.objects.none()

    def perform_create(self, serializer):
        active_question = Question.objects.filter(is_active=True).first()
        if active_question:
            serializer.save(user=self.request.user, question=active_question)
        else:
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
            
        return Response({
            'status': 'success',
            'liked': liked,
            'total_likes': answer.total_likes()
        })

# سیستم ثبت‌نام و لاگین ساده
@api_view(['POST'])
@permission_classes([AllowAny])
def custom_register_view(request):
    try:
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        
        # اعتبارسنجی
        if not username or not email or not password:
            return Response({'error': 'تمامی فیلدها الزامی هستند'}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(username=username).exists():
            return Response({'error': 'این نام کاربری قبلاً ثبت شده است'}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(email=email).exists():
            return Response({'error': 'این ایمیل قبلاً ثبت شده است'}, status=status.HTTP_400_BAD_REQUEST)
        
        # ایجاد کاربر
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        
        # ایجاد پروفایل
        UserProfile.objects.get_or_create(user=user)
        
        # لاگین خودکار
        login(request, user)
        
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
        return Response({'error': 'خطا در ثبت‌نام'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def custom_login_view(request):
    try:
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({'error': 'نام کاربری و رمز عبور الزامی هستند'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = authenticate(username=username, password=password)
        
        if user is not None:
            login(request, user)
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
            return Response({'error': 'نام کاربری یا رمز عبور اشتباه است'}, status=status.HTTP_401_UNAUTHORIZED)
            
    except Exception as e:
        return Response({'error': 'خطا در ورود'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def custom_logout_view(request):
    try:
        logout(request)
        return Response({'success': True, 'message': 'خروج موفقیت‌آمیز بود'})
    except Exception as e:
        return Response({'error': 'خطا در خروج'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def current_user_view(request):
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

def index(request):
    return render(request, 'core/index.html')
