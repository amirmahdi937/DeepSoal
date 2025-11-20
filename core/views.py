from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from django.db.models import Count
from django.utils import timezone
from django.shortcuts import render
from .models import Question, Answer, Category
from .serializers import QuestionSerializer, AnswerSerializer, CategorySerializer, StatsSerializer

# Viewهای اصلی
class ActiveQuestionView(generics.RetrieveAPIView):
    serializer_class = QuestionSerializer
    permission_classes = [AllowAny]
    
    def get_object(self):
        try:
            question = Question.objects.get(is_active=True)
            # محاسبه تعداد پاسخ‌ها
            question.total_answers = question.answer_set.count()
            return question
        except Question.DoesNotExist:
            return None

class AnswerListCreateView(generics.ListCreateAPIView):
    serializer_class = AnswerSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        active_question = Question.objects.filter(is_active=True).first()
        if active_question:
            return Answer.objects.filter(question=active_question).order_by('-created_at')
        return Answer.objects.none()

    def perform_create(self, serializer):
        active_question = Question.objects.filter(is_active=True).first()
        if active_question:
            author_name = self.request.data.get('author_name', 'ناشناس')
            if not author_name.strip():
                author_name = 'ناشناس'
            serializer.save(question=active_question, author_name=author_name)
        else:
            from rest_framework import serializers
            raise serializers.ValidationError("هیچ سوال فعالی وجود ندارد")

class AnswerLikeView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request, pk):
        try:
            answer = Answer.objects.get(pk=pk)
            answer.likes += 1
            answer.save()
            
            return Response({
                'success': True,
                'message': 'لایک ثبت شد!',
                'total_likes': answer.likes
            })
        except Answer.DoesNotExist:
            return Response({
                'success': False,
                'error': 'پاسخ یافت نشد'
            }, status=status.HTTP_404_NOT_FOUND)

# سیستم جستجو
class AnswerSearchView(generics.ListAPIView):
    serializer_class = AnswerSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ['answer_text', 'author_name', 'question__question_text']

    def get_queryset(self):
        return Answer.objects.all().select_related('question').order_by('-created_at')

# سیستم آمار و آنالیز
class StatsView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        # محاسبه آمار
        total_questions = Question.objects.count()
        total_answers = Answer.objects.count()
        total_likes = Answer.objects.aggregate(total_likes=Count('likes'))['total_likes'] or 0
        
        # کاربران فعال (تخمینی)
        active_users_today = Answer.objects.filter(
            created_at__date=timezone.now().date()
        ).values('author_name').distinct().count()
        
        stats = {
            'total_questions': total_questions,
            'total_answers': total_answers,
            'total_likes': total_likes,
            'active_users_today': active_users_today
        }
        
        serializer = StatsSerializer(stats)
        return Response(serializer.data)

# مدیریت دسته‌بندی‌ها
class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    queryset = Category.objects.all()

# همه پاسخ‌ها
class AllAnswersView(generics.ListAPIView):
    serializer_class = AnswerSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        return Answer.objects.all().select_related('question').order_by('-created_at')

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
        'version': '2.0.0'
    })
