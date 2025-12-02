document.addEventListener("DOMContentLoaded", function () {
  // ===== 1. 로그인 폼 =====
  const form = document.querySelector(".login-form");
  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const idInput = document.getElementById("id_user_id");
      const pwInput = document.getElementById("id_password");

      const idVal = idInput ? idInput.value.trim() : "";
      const pwVal = pwInput ? pwInput.value.trim() : "";

      if (!idVal || !pwVal) {
        alert("ID와 Password를 모두 입력해 주세요.");
        if (!idVal && idInput) idInput.focus();
        else if (!pwVal && pwInput) pwInput.focus();
        return;
      }

      const csrftoken = document.querySelector("input[name='csrfmiddlewaretoken']").value;

      // 기존 에러 메세지 제거
      document.querySelectorAll(".error").forEach((el) => el.remove());
      const msgArea = document.getElementById("messages-area");
      if (msgArea) {
        while (msgArea.firstChild) {
          msgArea.removeChild(msgArea.firstChild);
        }
      }

      const formData = new FormData(form);

      try {
        const res = await fetch("/accounts/login-api/", {
          method: "POST",
          headers: {
            "X-CSRFToken": csrftoken,
          },
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          const errors = data.errors || {};

          // messages-area에 에러 모아서 찍기
          if (msgArea) {
            const allMessages = [];

            if (errors.__all__) {
              allMessages.push(...errors.__all__);
            }
            if (errors.user_id) {
              allMessages.push(...errors.user_id);
            }
            if (errors.password) {
              allMessages.push(...errors.password);
            }

            allMessages.forEach((text) => {
              const p = document.createElement("p");
              p.className = "error";
              p.style.color = "red";
              p.textContent = text;
              msgArea.appendChild(p);
            });
          }
          return;
        }

        if (data.ok) {
          window.location.href = data.redirect_url || "/";
        }
      } catch (error) {
        console.error("로그인 중 오류 발생:", error);
        alert("로그인 처리 중 문제가 발생했습니다. 다시 시도하세요.");
      }
    });
  }

  // ===== 2. 비밀번호 찾기 버튼 =====
  const findPwBtn = document.getElementById("open-findpw-modal");
  if (findPwBtn) {
    findPwBtn.addEventListener("click", function(event) {
      event.preventDefault();
      alert("비밀번호 변경을 원하시면 관리자에게 문의하세요.");
    });
  }
});
