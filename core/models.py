from django.db import models
from django.db.models import Count
from django.utils import timezone

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

    def __str__(self):
        return self.question_text[:50] + "..." if len(self.question_text) > 50 else self.question_text

    def save(self, *args, **kwargs):
        if self.is_active:
            # فقط یک سوال می‌تواند فعال باشد
            Question.objects.filter(is_active=True).update(is_active=False)
        super().save(*args, **kwargs)

    def total_answers(self):
        return self.answer_set.count()

class Answer(models.Model):
    author_name = models.CharField(max_length=100)  # نام نویسنده
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer_text = models.TextField()
    likes = models.PositiveIntegerField(default=0)  # تعداد لایک‌ها
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_edited = models.BooleanField(default=False)

    def __str__(self):
        return f"پاسخ توسط {self.author_name}"

    class Meta:
        ordering = ['-created_at']
