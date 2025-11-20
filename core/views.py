from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from .models import Question, Answer
from .serializers import QuestionSerializer, AnswerSerializer

# Viewهای اصلی
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

# فقط این view ساده رو نگه دار
@api_view(['GET'])
def current_user_view(request):
    if request.user.is_authenticated:
        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email
        })
    return Response({'authenticated': False}, status=status.HTTP_401_UNAUTHORIZED)

def index(request):
    return render(request, 'core/index.html')
