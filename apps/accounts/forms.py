from django import forms

class LoginForm(forms.Form):
    user_id = forms.CharField(
        max_length=20,
        widget=forms.TextInput(attrs={
            "class": "form-input",
            "placeholder": "Value"
        })
        )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            "class": "form-input",
            "placeholder": "Value"
        })
    )