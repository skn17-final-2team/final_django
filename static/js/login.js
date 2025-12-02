document.addEventListener("DOMContentLoaded", function () {
  // ===== 1. 로그인 폼 검증 =====
  const form = document.querySelector(".login-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      const idInput = document.getElementById('id_user_id');
      const pwInput = document.getElementById('id_password');

      const idVal = idInput ? idInput.value.trim() : "";
      const pwVal = pwInput ? pwInput.value.trim() : "";

      if (!idVal || !pwVal) {
        e.preventDefault();
        alert("ID와 Password를 모두 입력해 주세요.");
        if (!idVal && idInput) idInput.focus();
        else if (!pwVal && pwInput) pwInput.focus();
      }
    });
  }
  document.getElementById("open-findpw-modal").addEventListener("click", function(event) {
    event.preventDefault();
    alert("비밀번호 변경을 원하시면 관리자에게 문의하세요.");
  });
});