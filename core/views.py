from rest_framework import generics, status
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import render
from datetime import timedelta
from .models import Question, Answer
from .serializers import QuestionSerializer, AnswerSerializer


class ActiveQuestionView(generics.RetrieveAPIView):
    serializer_class = QuestionSerializer

    def get_object(self):
        # سوالی که is_active=True باشد را برمی‌گرداند.
        # تو پنل ادمین یک سوال را به عنوان فعال标记 می‌کنی.
        try:
            return Question.objects.get(is_active=True)
        except Question.DoesNotExist:
            return None

class AnswerListCreateView(generics.ListCreateAPIView):
    serializer_class = AnswerSerializer

    def get_queryset(self):
        # فقط پاسخ‌های سوال فعال را نشان می‌دهد، از جدید به قدیم
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

    def update(self, request, *args, **kwargs):
        answer = self.get_object()
        user = request.user

        if user.is_authenticated:
            if user in answer.likes.all():
                answer.likes.remove(user) # لایک را برمی‌دارد
            else:
                answer.likes.add(user) # لایک می‌کند
            return Response({'status': 'liked updated', 'total_likes': answer.total_likes()})
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)


def index(request):
    return render(request, 'core/index.html')
