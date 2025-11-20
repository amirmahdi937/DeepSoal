from django.shortcuts import render
from django.http import JsonResponse
from .models import Question, Answer

def index(request):
    return render(request, 'core/index.html')

def get_question(request):
    question = Question.objects.filter(is_active=True).first()
    if question:
        return JsonResponse({
            'text': question.text,
            'id': question.id
        })
    return JsonResponse({'error': 'سوالی یافت نشد'})

def get_answers(request):
    question = Question.objects.filter(is_active=True).first()
    if question:
        answers = Answer.objects.filter(question=question).order_by('-created_at')
        answers_data = []
        for answer in answers:
            answers_data.append({
                'id': answer.id,
                'author': answer.author,
                'text': answer.text,
                'likes': answer.likes,
                'created_at': answer.created_at.strftime('%Y-%m-%d %H:%M')
            })
        return JsonResponse(answers_data, safe=False)
    return JsonResponse([], safe=False)

def add_answer(request):
    if request.method == 'POST':
        question = Question.objects.filter(is_active=True).first()
        if question:
            author = request.POST.get('author', 'ناشناس')
            text = request.POST.get('text', '')
            if text:
                Answer.objects.create(
                    question=question,
                    author=author,
                    text=text
                )
                return JsonResponse({'success': True})
    return JsonResponse({'success': False})

def like_answer(request, answer_id):
    try:
        answer = Answer.objects.get(id=answer_id)
        answer.likes += 1
        answer.save()
        return JsonResponse({'success': True, 'likes': answer.likes})
    except Answer.DoesNotExist:
        return JsonResponse({'success': False})
