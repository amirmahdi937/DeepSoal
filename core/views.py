from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.utils import timezone
from django.shortcuts import render
from .models import Question, Answer, UserProfile
from .serializers import QuestionSerializer, AnswerSerializer, UserSerializer

# Viewهای قبلی (همان‌ها را نگه دار)
class ActiveQuestionView(generics.RetrieveAPIView):
    serializer_class = QuestionSerializer
    def get_object(self):
        try:
            return Question.objects.get(is_active=True)
        except Question.DoesNotExist:
            return None

class AnswerListCreateView(generics.ListCreateAPIView):
    serializer_class = AnswerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        active_question = Question.objects.filter(is_active=True).first()
        if active_question:
            return Answer.objects.filter(question=active_question).order_by('-created_at')
        return Answer.objects.none()

    def perform_create(self, serializer):
        active_question = Question.objects.filter(is_active=True).first()
        if active_question:
            serializer.save(user=self.request.user, question=active_question)

class AnswerLikeView(generics.UpdateAPIView):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer
    permission_classes = [IsAuthenticated]

    def update(self, request, *args, **kwargs):
        answer = self.get_object()
        user = request.user
        if user in answer.likes.all():
            answer.likes.remove(user)
        else:
            answer.likes.add(user)
        return Response({'status': 'liked updated', 'total_likes': answer.total_likes()})

# Viewهای جدید برای ثبت‌نام
@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    from django.contrib.auth.forms import UserCreationForm
    form = UserCreationForm(request.data)
    if form.is_valid():
        user = form.save()
        UserProfile.objects.create(user=user)
        return Response({'message': 'User created successfully'}, status=status.HTTP_201_CREATED)
    return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if user:
        login(request, user)
        return Response({'message': 'Login successful', 'user': UserSerializer(user).data})
    return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
def logout_view(request):
    logout(request)
    return Response({'message': 'Logout successful'})

@api_view(['GET'])
def current_user_view(request):
    if request.user.is_authenticated:
        return Response(UserSerializer(request.user).data)
    return Response({'detail': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)

def index(request):
    return render(request, 'core/index.html')
