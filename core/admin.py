from django.contrib import admin
from .models import Question, UserProfile, Answer

admin.site.register(Question)
admin.site.register(UserProfile)
admin.site.register(Answer)