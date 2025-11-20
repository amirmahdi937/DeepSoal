from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Question(models.Model):
    question_text = models.TextField()
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.question_text

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    # می‌توانی فیلدهای بیشتر مثل آواتار اینجا اضافه کنی

class Answer(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer_text = models.TextField()
    likes = models.ManyToManyField(User, related_name='liked_answers', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def total_likes(self):
        return self.likes.count()

    def __str__(self):
        return f"Answer by {self.user.username} to {self.question}"
