

document.addEventListener("DOMContentLoaded", function () {
  /* ===== 특화 도메인: 최대 3개 제한 ===== */
  const domainCheckboxes = document.querySelectorAll("[data-domain-checkbox]");
  const maxDomains = 3;
  const toggleWrapper = document.getElementById("domain-toggle-wrapper");
  const toggleBtn = document.getElementById("btn-domain-toggle");
  const modal = document.getElementById("domain-modal");
  if (toggleWrapper && toggleBtn && modal) {
    // 토글 클릭 시 열고 닫기
    toggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      modal.classList.toggle("is-open");
      toggleWrapper.classList.toggle("is-open");
    });

    // 모달 밖 클릭하면 닫기
    document.addEventListener("click", function (e) {
      if (
        !toggleWrapper.contains(e.target) &&
        modal.classList.contains("is-open")
      ) {
        modal.classList.remove("is-open");
        toggleWrapper.classList.remove("is-open");
      }
    });
  }

  // ===== 도메인 최대 3개 제한 =====
  function syncDomainLimit() {
    const checked = Array.from(domainCheckboxes).filter((c) => c.checked);
    const isFull = checked.length >= 3;
    domainCheckboxes.forEach((c) => {
      if (!c.checked) {
        c.disabled = isFull;
      }
    });
  }
  domainCheckboxes.forEach((c) => {
    c.addEventListener("change", syncDomainLimit);
  });
  syncDomainLimit();

  function updateDomainSelection(evt) {
    const checked = Array.from(domainCheckboxes).filter((cb) => cb.checked);
    if (checked.length > maxDomains) {
      // 방금 체크한 것만 해제
      evt.target.checked = false;
      alert(`특화 도메인은 최대 ${maxDomains}개까지 선택할 수 있습니다.`);
    }
  }

  domainCheckboxes.forEach((cb) => {
    cb.addEventListener("change", updateDomainSelection);
  });

  /* ===== 도메인 파일 업로드: 파일명 표시 ===== */
  const domainFileInput = document.getElementById("id_domain_file");
  const domainFileNameSpan = document.getElementById("domain-file-name");

  if (domainFileInput && domainFileNameSpan) {
    domainFileInput.addEventListener("change", function () {
      if (domainFileInput.files && domainFileInput.files.length > 0) {
        domainFileNameSpan.textContent = domainFileInput.files[0].name;
      } else {
        domainFileNameSpan.textContent = "지원 형식: TXT / CSV / XLSX";
      }
    });
  }

  /* ===== 참석자 선택 ===== */
  const treeUsers = document.querySelectorAll(".tree-user");
  const selectedList = document.getElementById("selected-attendee-list");
  const attendeeCount = document.getElementById("attendee-count");
  const loginUserId = document.getElementById("login-user-id")?.value;
  const loginUserName = document.getElementById("login-user-name")?.value;
  const clearBtn = document.getElementById("btn-clear-attendees");

  function refreshCount() {
    if (!attendeeCount || !selectedList) return;
    const count = selectedList.querySelectorAll(".selected-attendee-item").length;
    attendeeCount.textContent = `${count}명`;
  }

  function createHiddenInput(userId) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "attendees";
    input.value = userId;
    return input;
  }

  function handleUserClick(e) {
    const el = e.currentTarget;
    const userId = el.dataset.userId;
    const userName = el.dataset.userName || el.textContent.trim();

    if (userId === loginUserId) {
    return;
    }

    if (!selectedList) return;
    // 이미 선택되었는지 확인
    const exists = selectedList.querySelector(
      `.selected-attendee-item[data-user-id="${userId}"]`
    );
    if (exists) return;

    const li = document.createElement("li");
    li.className = "selected-attendee-item";
    li.dataset.userId = userId;

    const nameSpan = document.createElement("span");
    nameSpan.textContent = userName;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "attendee-remove-btn";
    removeBtn.innerHTML = "×";

    removeBtn.addEventListener("click", function () {
      const loginUserId = document.getElementById("login-user-id")?.value;

      // 로그인 유저 삭제 금지
      if (userId === loginUserId) {
        alert("회의 생성자는 참석자 목록에서 제거할 수 없습니다.");
        return;
      }

      li.remove();
      refreshCount();
    });

    li.appendChild(nameSpan);
    li.appendChild(removeBtn);
    li.appendChild(createHiddenInput(userId));
    selectedList.appendChild(li);

    refreshCount();
  }

  treeUsers.forEach((userEl) => {
  if (userEl.dataset.userId === loginUserId) {
    userEl.classList.add("tree-user-disabled");   // CSS로 비활성화 스타일 가능
  } else {
    userEl.addEventListener("click", handleUserClick);
  }
 });

  /* ===== 로그인 유저를 기본 참석자로 자동 추가 ===== */
  const loginUserIdInput = document.getElementById("login-user-id");
  const loginUserNameInput = document.getElementById("login-user-name");

  if (loginUserIdInput && loginUserNameInput && selectedList) {
    const loginUserId = loginUserIdInput.value;
    const loginUserName = loginUserNameInput.value;

    // 이미 선택되어 있지 않은 경우에만 추가
    const exists = selectedList.querySelector(
      `.selected-attendee-item[data-user-id="${loginUserId}"]`
    );
    if (!exists) {
      const li = document.createElement("li");
      li.className = "selected-attendee-item";
      li.dataset.userId = loginUserId;

      const nameSpan = document.createElement("span");
      nameSpan.textContent = loginUserName;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "attendee-remove-btn";
      removeBtn.innerHTML = "×";

      removeBtn.addEventListener("click", function () {
        if (loginUserId === loginUserIdInput.value) {
            alert("회의 생성자는 참석자 목록에서 제거할 수 없습니다.");
            return;
        }
        li.remove();
        refreshCount();
      });

      li.appendChild(nameSpan);
      li.appendChild(removeBtn);
      selectedList.appendChild(li);

      refreshCount();
    }
  }

  if (clearBtn && selectedList) {
    clearBtn.addEventListener("click", function () {
      selectedList.innerHTML = "";
      refreshCount();
    });
  }

  refreshCount();

  // === 폼 제출 시 참석자 최소 1명 검사 ===
  const form = document.querySelector(".meeting-form");
  const attendeeError = document.getElementById("attendee-error");
  const attendeeSelectedBox = document.querySelector(".attendee-selected");

  if (form && selectedList) {
    form.addEventListener("submit", function (e) {
      const count = selectedList.querySelectorAll(
        ".selected-attendee-item"
      ).length;

      if (count === 0) {
        // 참석자 0명이면 제출 막고 에러 표시
        e.preventDefault();

        if (attendeeError) {
          attendeeError.style.display = "block";
        }
        if (attendeeSelectedBox) {
          attendeeSelectedBox.classList.add("attendee-error-border");
          // 화면 중앙 정도로 스크롤
          attendeeSelectedBox.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      } else {
        // 최소 1명 이상이면 에러 숨기고 그대로 제출
        if (attendeeError) {
          attendeeError.style.display = "none";
        }
        if (attendeeSelectedBox) {
          attendeeSelectedBox.classList.remove("attendee-error-border");
        }
        // e.preventDefault() 호출하지 않음 → 브라우저 기본 검증 + 제출 진행
      }
    });
  }
});
