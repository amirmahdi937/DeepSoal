from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Question, Answer

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = '__all__'

class AnswerSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    total_likes = serializers.ReadOnlyField()
    user_has_liked = serializers.SerializerMethodField()

    class Meta:
        model = Answer
        fields = '__all__'

    def get_user_has_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return request.user in obj.likes.all()
        return False
