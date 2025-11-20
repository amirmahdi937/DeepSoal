from rest_framework import serializers
from .models import Question, Answer, Category

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class QuestionSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    total_answers = serializers.ReadOnlyField()

    class Meta:
        model = Question
        fields = '__all__'

class AnswerSerializer(serializers.ModelSerializer):
    time_since = serializers.SerializerMethodField()

    class Meta:
        model = Answer
        fields = '__all__'

    def get_time_since(self, obj):
        from django.utils import timezone
        from django.utils.timesince import timesince
        return timesince(obj.created_at, timezone.now()) + ' پیش'

class StatsSerializer(serializers.Serializer):
    total_questions = serializers.IntegerField()
    total_answers = serializers.IntegerField()
    total_likes = serializers.IntegerField()
    active_users_today = serializers.IntegerField()
