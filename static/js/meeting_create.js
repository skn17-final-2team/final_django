document.addEventListener("DOMContentLoaded", function () {
  /* ===== 특화 도메인: 최대 3개 제한 ===== */
  const domainCheckboxes = document.querySelectorAll("[data-domain-checkbox]");
  const maxDomains = 3;

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
    userEl.addEventListener("click", handleUserClick);
  });

  if (clearBtn && selectedList) {
    clearBtn.addEventListener("click", function () {
      selectedList.innerHTML = "";
      refreshCount();
    });
  }

  refreshCount();
});
