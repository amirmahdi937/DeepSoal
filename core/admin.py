from django.contrib import admin
from .models import Question, Answer, Category

# ثبت مدل‌ها در ادمین
admin.site.register(Question)
admin.site.register(Answer)
admin.site.register(Category)
