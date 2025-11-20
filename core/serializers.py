from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Question, Answer, UserProfile, Category, UserActivity

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'profile')

    def get_profile(self, obj):
        profile = UserProfile.objects.get(user=obj)
        return {
            'bio': profile.bio,
            'website': profile.website,
            'location': profile.location,
            'joined_date': profile.joined_date,
            'reputation': profile.reputation,
            'total_answers': profile.total_answers(),
            'total_likes_received': profile.total_likes_received()
        }

class QuestionSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    total_answers_display = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = '__all__'

    def get_total_answers_display(self, obj):
        return obj.answer_set.count()

class AnswerSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    question = QuestionSerializer(read_only=True)
    total_likes = serializers.ReadOnlyField()
    user_has_liked = serializers.SerializerMethodField()
    time_since = serializers.SerializerMethodField()

    class Meta:
        model = Answer
        fields = '__all__'

    def get_user_has_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return request.user in obj.likes.all()
        return False

    def get_time_since(self, obj):
        from django.utils import timezone
        from django.utils.timesince import timesince
        return timesince(obj.created_at, timezone.now()) + ' پیش'

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    total_answers = serializers.ReadOnlyField()
    total_likes_received = serializers.ReadOnlyField()
    recent_answers = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = '__all__'

    def get_recent_answers(self, obj):
        recent_answers = obj.get_recent_answers()
        return AnswerSerializer(recent_answers, many=True, context=self.context).data

class UserActivitySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserActivity
        fields = '__all__'

class StatsSerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    total_questions = serializers.IntegerField()
    total_answers = serializers.IntegerField()
    total_likes = serializers.IntegerField()
    active_users_today = serializers.IntegerField()
