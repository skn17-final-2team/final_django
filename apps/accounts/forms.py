from django import forms

class LoginForm(forms.Form):
    user_id = forms.CharField(max_length=20)
    password = forms.CharField(widget=forms.PasswordInput)