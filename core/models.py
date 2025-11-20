from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Sum, Count

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#6366f1')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Categories"

class Question(models.Model):
    question_text = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    total_answers = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.question_text[:50] + "..." if len(self.question_text) > 50 else self.question_text

    def save(self, *args, **kwargs):
        if self.is_active:
            # فقط یک سوال می‌تواند فعال باشد
            Question.objects.filter(is_active=True).update(is_active=False)
        super().save(*args, **kwargs)

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(max_length=500, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    website = models.URLField(blank=True)
    location = models.CharField(max_length=100, blank=True)
    joined_date = models.DateTimeField(auto_now_add=True)
    reputation = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.user.username} Profile"

    def total_answers(self):
        return self.user.answer_set.count()

    def total_likes_received(self):
        return Answer.objects.filter(user=self.user).aggregate(
            total_likes=Count('likes')
        )['total_likes'] or 0

    def get_recent_answers(self, limit=5):
        return self.user.answer_set.all().order_by('-created_at')[:limit]

class Answer(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer_text = models.TextField()
    likes = models.ManyToManyField(User, related_name='liked_answers', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_edited = models.BooleanField(default=False)

    def __str__(self):
        return f"Answer by {self.user.username} to {self.question}"

    def total_likes(self):
        return self.likes.count()

    def save(self, *args, **kwargs):
        if self.pk:
            self.is_edited = True
        super().save(*args, **kwargs)

class UserActivity(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    activity_type = models.CharField(max_length=50, choices=[
        ('login', 'ورود'),
        ('logout', 'خروج'),
        ('answer', 'ارسال پاسخ'),
        ('like', 'لایک کردن'),
        ('register', 'ثبت‌نام')
    ])
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.TextField(blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.activity_type}"

    class Meta:
        verbose_name_plural = "User Activities"
