document.addEventListener("DOMContentLoaded", () => {
  const meetingDetailRoot = document.getElementById("meeting-detail-root");
  if (!meetingDetailRoot) return;

  const meetingId = meetingDetailRoot.dataset.meetingId || "";
  const csrfInput = document.getElementById("csrf-token");
  const csrftoken = csrfInput ? csrfInput.value : "";
  const isHost =
    (meetingDetailRoot.dataset.isHost || "").toLowerCase() === "true";
  const loginUserName = meetingDetailRoot.dataset.loginUserName || "";
  const loginUserId = meetingDetailRoot.dataset.loginUserId || "";

  /* =========================================
   * 1. 탭 전환 (요약 / 태스크 / 회의록)
   * ========================================= */
  const tabButtons = document.querySelectorAll(".detail-tab");
  const tabPanels = document.querySelectorAll(".detail-tab-panel");

  function activateTab(tabName, btn) {
    // 탭 버튼 클래스 처리
    tabButtons.forEach((t) => t.classList.remove("detail-tab-active"));
    if (btn) {
      btn.classList.add("detail-tab-active");
    }

    // 패널 표시 처리
    tabPanels.forEach((panel) =>
      panel.classList.remove("detail-tab-panel-active")
    );
    const targetPanel = document.querySelector(
      `.detail-tab-panel[data-tab-panel="${tabName}"]`
    );
    if (targetPanel) {
      targetPanel.classList.add("detail-tab-panel-active");
    }
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tabTarget; // summary / tasks / minutes
      activateTab(target, btn);
      console.log("tab click:", target);
      if (target) {
        window.location.hash = `#${target}`;
      }

      if (target === "minutes") {
      // openMinutesConfig 함수는 아래쪽에서 선언되어 있음 (function 선언이라 호이스팅됨)
      if (typeof openMinutesConfig === "function") {
        openMinutesConfig();
      }
    }
    });
  });

  // URL hash에 따라 초기 탭 활성화
  const initialTab = (window.location.hash || "").replace("#", "");
  if (initialTab) {
    const btn = Array.from(tabButtons).find(
      (b) => b.dataset.tabTarget === initialTab
    );
    if (btn) {
      activateTab(initialTab, btn);
    } else {
      activateTab("summary", document.querySelector('.detail-tab[data-tab-target="summary"]'));
    }
  } else {
    // 기본 요약 탭 보이기
    activateTab("summary", document.querySelector('.detail-tab[data-tab-target="summary"]'));
  }

  /* =========================================
   * 2. 회의 정보 팝업 (상단 제목 옆 화살표)
   * ========================================= */
  const meetingInfoToggle = document.getElementById("meeting-info-toggle");
  const meetingInfoOverlay = document.getElementById("meeting-info-overlay");
  const meetingInfoClose = document.getElementById("meeting-info-close");

  function openMeetingInfo() {
    if (!meetingInfoOverlay || !meetingInfoToggle) return;
    meetingInfoOverlay.style.display = "block";
    meetingInfoToggle.setAttribute("aria-expanded", "true");
  }

  function closeMeetingInfo() {
    if (!meetingInfoOverlay || !meetingInfoToggle) return;
    meetingInfoOverlay.style.display = "none";
    meetingInfoToggle.setAttribute("aria-expanded", "false");
  }

  if (meetingInfoToggle && meetingInfoOverlay) {
    meetingInfoToggle.addEventListener("click", () => {
      const expanded =
        meetingInfoToggle.getAttribute("aria-expanded") === "true";
      if (expanded) {
        closeMeetingInfo();
      } else {
        openMeetingInfo();
      }
    });
  }

  if (meetingInfoClose) {
    meetingInfoClose.addEventListener("click", closeMeetingInfo);
  }

  if (meetingInfoOverlay) {
    meetingInfoOverlay.addEventListener("click", (e) => {
      if (e.target === meetingInfoOverlay) {
        closeMeetingInfo();
      }
    });
  }

  /* =========================================
   * 3. 전문 관련: 전체 복사 / 음성 다운로드
   * ========================================= */
  const transcriptScroll = document.getElementById("detail-transcript-scroll");
  const btnCopyFullTranscript = document.getElementById(
    "btn-copy-full-transcript"
  );
  const btnAudioDownload = document.getElementById("btn-audio-download");

  if (btnCopyFullTranscript && transcriptScroll) {
    btnCopyFullTranscript.addEventListener("click", async () => {
      const text = transcriptScroll.innerText || transcriptScroll.textContent || "";
      if (!text.trim()) {
        alert("복사할 전문 내용이 없습니다.");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        alert("전문 전체가 클립보드에 복사되었습니다.");
      } catch (err) {
        console.error("copy transcript error:", err);
        alert("클립보드 복사에 실패했습니다.");
      }
    });
  }

  if (btnAudioDownload && meetingId) {
    btnAudioDownload.addEventListener("click", () => {
      // 실제 다운로드 URL 패턴에 맞춰 조정 가능
      // 여기서는 일단 녹음 화면/다운로드를 담당하는 URL로 이동하도록 처리
      window.location.href = `/meetings/${meetingId}/record/`;
    });
  }

  /* =========================================
   * 4. 태스크 저장 (Who/What/When)
   * ========================================= */
  const taskSaveBtn = document.getElementById("btn-tasks-save");
  if (taskSaveBtn && meetingId && isHost) {
    taskSaveBtn.addEventListener("click", async () => {
      const rows = Array.from(document.querySelectorAll(".detail-task-row"));
      const tasksPayload = [];

      rows.forEach((row) => {
        const who = (row.querySelector('[data-task-field="who"]')?.value || "").trim();
        const what = (row.querySelector('[data-task-field="what"]')?.value || "").trim();
        const when = (row.querySelector('[data-task-field="when"]')?.value || "").trim();
        let assigneeId =
          row.dataset.assigneeId ||
          row.querySelector('[data-task-field="who"]')?.dataset.userId ||
          "";
        // 호스트가 자신을 지정했는데 ID가 비어있다면 직접 채운다.
        if (!assigneeId && isHost && loginUserId) {
          const whoNorm = normalizeWho(who);
          const selfNorm = normalizeWho(loginUserName);
          if (whoNorm && selfNorm && whoNorm === selfNorm) {
            assigneeId = loginUserId;
          }
        }
        if (!who && !what && !when) return;

        const taskData = { who, what, when };
        if (assigneeId) {
          taskData.assignee_id = assigneeId;
        }
        const taskId = row.dataset.taskId;
        if (taskId) {
          taskData.id = taskId;
        }
        tasksPayload.push(taskData);
      });

      try {
        const res = await fetch(`/meetings/${meetingId}/tasks/save/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken,
          },
          body: JSON.stringify({ tasks: tasksPayload }),
        });

        const data = await res.json();
        if (!res.ok || data.ok === false) {
          throw new Error(data.error || "태스크 저장 중 오류가 발생했습니다.");
        }
        alert("태스크가 저장되었습니다.");
        // 저장 후에도 태스크 탭을 유지하도록 해시를 설정한 뒤 새로고침
        const path = window.location.pathname;
        window.location.href = `${path}#tasks`;
        window.location.reload();
      } catch (err) {
        console.error("tasks save error:", err);
        alert(err.message || "태스크 저장에 실패했습니다.");
      }
    });
  }

  /* ---------- WHO 드롭다운 유틸 ---------- */
  // 전체 사용자 정보(JSON) 파싱
  let usersData = [];
  const usersScript = document.getElementById("task-users-data");
  if (usersScript && usersScript.textContent) {
    try {
      usersData = JSON.parse(usersScript.textContent);
    } catch (e) {
      usersData = [];
    }
  }
  const whoOptions = [
    "대상 없음",
    ...usersData.map((u) => buildLabel(u)),
  ];
  const loginUserRaw = (loginUserName || "").trim();

  function normalizeWho(val) {
    return (val || "").trim().toLowerCase();
  }
  function buildLabel(u) {
    const dept = u.dept__dept_name ? ` (${u.dept__dept_name})` : "";
    return `${u.name}${dept}`;
  }
  function getUsersByLabel(labelNormalized) {
    return usersData.filter(
      (u) => normalizeWho(buildLabel(u)) === labelNormalized
    );
  }

  // Add 버튼 활성화 조건 바인딩
function bindRowAddButton(row) {
  const whoInput = row.querySelector(".task-who-input");
  const addBtn = row.querySelector(".detail-task-add-btn");
  if (!addBtn) return;
  // row에 내려온 assignee_id를 입력값에도 반영
  if (row.dataset.assigneeId && whoInput) {
    whoInput.dataset.userId = row.dataset.assigneeId;
  }
  const applyState = () => {
    const whoValNormalized = normalizeWho(whoInput ? whoInput.value : "");
    const assigneeIdInRow =
      row.dataset.assigneeId || (whoInput ? whoInput.dataset.userId : "");
    let allowed = false;
    if (whoValNormalized === "대상 없음".toLowerCase()) {
      allowed = true;
      if (whoInput) {
        delete whoInput.dataset.userId;
      }
      row.dataset.assigneeId = "";
    } else if (
      loginUserId &&
      assigneeIdInRow &&
      String(assigneeIdInRow) === String(loginUserId)
    ) {
      allowed = true;
    }
    addBtn.disabled = !allowed;
    addBtn.style.display = allowed ? "inline-block" : "none";
  };
  applyState();
  if (whoInput) {
    whoInput.addEventListener("blur", () => {
      const selectedId = whoInput.dataset.userId || "";
      if (selectedId) {
        row.dataset.assigneeId = selectedId;
      } else {
        row.dataset.assigneeId = "";
      }
    });
    whoInput.addEventListener("input", () => {
      if (!whoInput.value.trim()) {
        delete whoInput.dataset.userId;
        row.dataset.assigneeId = "";
      }
      applyState();
    });
  }
  }

  // 태스크 추가 버튼(상단)으로 빈 행 추가
  const taskAddMainBtn = document.getElementById("btn-tasks-add-main");
  function addTaskRow() {
    const body = document.querySelector(".detail-task-body");
    if (!body) return;
    const newRow = document.createElement("div");
    newRow.className = "detail-task-row";
    const toggleBtnHtml = isHost
      ? '<button type="button" class="task-who-toggle" aria-label="who 목록 열기">&#9662;</button>'
      : "";
    newRow.innerHTML = `
      <div class="detail-task-col detail-task-col-check">
        <input type="checkbox" class="task-row-check">
      </div>
      <div class="detail-task-col detail-task-col-who">
        <div class="task-who-wrapper">
          <input type="text" class="task-edit-field task-who-input" data-task-field="who" list="task-who-options" />
          ${toggleBtnHtml}
        </div>
      </div>
      <div class="detail-task-col detail-task-col-what">
        <textarea class="task-edit-field" data-task-field="what" rows="2"></textarea>
      </div>
      <div class="detail-task-col detail-task-col-when">
        <textarea class="task-edit-field" data-task-field="when" rows="2"></textarea>
      </div>
      <div class="detail-task-col detail-task-col-add">
        <button type="button" class="detail-task-add-btn">추가</button>
      </div>
    `;
    body.appendChild(newRow);
    const newWrapper = newRow.querySelector(".task-who-wrapper");
    if (newWrapper) {
      bindWhoDropdown(newWrapper);
    }
    bindRowAddButton(newRow);
    const addBtn = newRow.querySelector(".detail-task-add-btn");
    if (addBtn) {
      bindAddButtonCalendar(addBtn);
    }
    const firstInput = newRow.querySelector(".task-who-input");
    if (firstInput) {
      firstInput.focus();
    }
    body.scrollTop = body.scrollHeight;
  }
  if (taskAddMainBtn && isHost) {
    taskAddMainBtn.addEventListener("click", addTaskRow);
  }

  // 태스크 행 삭제: 선택 삭제
  const taskDeleteSelectedBtn = document.getElementById("btn-tasks-delete-selected");
  const taskCheckAll = document.getElementById("task-check-all");

  function deleteSelectedTasks() {
    const rows = document.querySelectorAll(".detail-task-row");
    rows.forEach((row) => {
      const chk = row.querySelector(".task-row-check");
      if (chk && chk.checked) {
        row.remove();
      }
    });
  }

  if (taskDeleteSelectedBtn && isHost) {
    taskDeleteSelectedBtn.addEventListener("click", deleteSelectedTasks);
  }
  if (taskCheckAll && isHost) {
    taskCheckAll.addEventListener("change", (e) => {
      const checked = e.target.checked;
      document.querySelectorAll(".task-row-check").forEach((chk) => {
        chk.checked = checked;
      });
    });
  }

function bindWhoDropdown(wrapper) {
  const input = wrapper.querySelector(".task-who-input");
  const toggle = wrapper.querySelector(".task-who-toggle");
  if (!input) return;

    wrapper.style.position = "relative";

    const dropdown = document.createElement("div");
    dropdown.className = "task-who-dropdown";
    dropdown.style.display = "none";
    wrapper.appendChild(dropdown);

    const renderList = (keyword = "") => {
      dropdown.innerHTML = "";
      // 대상 없음
      const noneItem = document.createElement("div");
      noneItem.className = "task-who-dropdown-item";
      noneItem.textContent = "대상 없음";
      noneItem.dataset.userId = "";
      noneItem.addEventListener("click", () => {
        input.value = "대상 없음";
        delete input.dataset.userId;
        const row = wrapper.closest(".detail-task-row");
        if (row) {
          row.dataset.assigneeId = "";
        }
        dropdown.style.display = "none";
      });
      dropdown.appendChild(noneItem);
      // 사용자 목록
      usersData.forEach((u) => {
        const label = buildLabel(u);
        const item = document.createElement("div");
        item.className = "task-who-dropdown-item";
        item.textContent = label;
        item.dataset.userId = u.user_id;
        item.addEventListener("click", () => {
          input.value = label;
          input.dataset.userId = u.user_id;
          const row = wrapper.closest(".detail-task-row");
          if (row) {
            row.dataset.assigneeId = u.user_id;
          }
          dropdown.style.display = "none";
        });
        dropdown.appendChild(item);
      });
    };

    const show = () => {
      renderList(input.value.trim());
      dropdown.style.display = "block";
    };
    const hide = () => {
      dropdown.style.display = "none";
    };

    const openDropdown = () => {
      renderList();
      dropdown.style.display = "block";
    };
    const closeDropdown = () => {
      dropdown.style.display = "none";
    };

    if (toggle) {
      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropdown.style.display === "block") {
          closeDropdown();
        } else {
          openDropdown();
        }
      });
    }

    input.addEventListener("focus", openDropdown);
    input.addEventListener("input", () => {
      if (dropdown.style.display === "block") {
        renderList(input.value.trim());
      }
    });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) {
      hide();
    }
  });
}

// 기존 행에도 커스텀 드롭다운/버튼 상태 바인딩
document.querySelectorAll(".task-who-wrapper").forEach(bindWhoDropdown);
document.querySelectorAll(".detail-task-row").forEach(bindRowAddButton);
document
  .querySelectorAll(".detail-task-add-btn")
  .forEach((btn) => bindAddButtonCalendar(btn));

  /* ---------- Add 버튼: 캘린더 팝오버 ---------- */
  let calendarPopover = null;
  let calendarDateInput = null;
  let calendarConfirmBtn = null;
  let calendarCancelBtn = null;
  let calendarCurrentRow = null;

  function ensureCalendarPopover() {
    if (calendarPopover) return;
    calendarPopover = document.createElement("div");
    calendarPopover.className = "task-calendar-popover";
    calendarPopover.innerHTML = `
      <div class="task-calendar-header">일정 추가</div>
      <div class="task-calendar-body">
        <label class="task-calendar-label">날짜 선택</label>
        <input type="date" class="task-calendar-date" />
      </div>
      <div class="task-calendar-actions">
        <button type="button" class="task-calendar-btn task-calendar-cancel">취소</button>
        <button type="button" class="task-calendar-btn task-calendar-confirm">확인</button>
      </div>
    `;
    document.body.appendChild(calendarPopover);
    calendarDateInput = calendarPopover.querySelector(".task-calendar-date");
    calendarConfirmBtn = calendarPopover.querySelector(".task-calendar-confirm");
    calendarCancelBtn = calendarPopover.querySelector(".task-calendar-cancel");

    calendarCancelBtn.addEventListener("click", hideCalendarPopover);
    calendarConfirmBtn.addEventListener("click", handleCalendarConfirm);

    document.addEventListener("click", (e) => {
      if (!calendarPopover) return;
      if (
        calendarPopover.style.display === "block" &&
        !calendarPopover.contains(e.target) &&
        !(e.target && e.target.classList.contains("detail-task-add-btn"))
      ) {
        hideCalendarPopover();
      }
    });
  }

  function hideCalendarPopover() {
    if (!calendarPopover) return;
    calendarPopover.style.display = "none";
    calendarCurrentRow = null;
  }

  function showCalendarPopover(targetBtn, row) {
    ensureCalendarPopover();
    calendarCurrentRow = row;
    const rect = targetBtn.getBoundingClientRect();
    const popoverWidth = 220;
    const centerOffset = rect.left + rect.width / 2 - popoverWidth / 2;
    calendarPopover.style.left = `${Math.max(8, centerOffset + window.scrollX)}px`;
    calendarPopover.style.top = `${rect.bottom + window.scrollY + 6}px`;
    calendarPopover.style.display = "block";
    if (calendarDateInput) {
      calendarDateInput.value = "";
      calendarDateInput.focus();
    }
  }

  function handleCalendarConfirm() {
    if (!calendarCurrentRow || !calendarDateInput) return;
    const dateVal = calendarDateInput.value;
    if (!dateVal) {
      alert("날짜를 선택해 주세요.");
      return;
    }
    const whoVal =
      calendarCurrentRow.querySelector('[data-task-field="who"]')?.value || "";
    const whatVal =
      calendarCurrentRow.querySelector('[data-task-field="what"]')?.value || "";
    const whenVal =
      calendarCurrentRow.querySelector('[data-task-field="when"]')?.value || "";
    const title = whatVal || "회의 태스크";
    const detailsParts = [];
    if (whoVal) detailsParts.push(`Who: ${whoVal}`);
    if (whenVal) detailsParts.push(`When: ${whenVal}`);
    const details = detailsParts.join(" | ");
    const start = dateVal.replace(/-/g, "");
    const end = start;
    const url =
      "https://calendar.google.com/calendar/render" +
      `?action=TEMPLATE&text=${encodeURIComponent(title)}` +
      `&details=${encodeURIComponent(details || title)}` +
      `&dates=${start}/${end}`;
    window.open(url, "_blank");
    hideCalendarPopover();
  }

  function bindAddButtonCalendar(btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const row = btn.closest(".detail-task-row");
      if (!row) return;
      showCalendarPopover(btn, row);
    });
  }

/* =========================================
 * 5. 회의록( minutes ) 에디터 관련
 *    - 구성 선택 팝업
 *    - 템플릿에서 섹션 생성
 *    - 저장
 * ========================================= */

  // minutes 탭 안의 에디터만 명시적으로 선택
  const minutesEditor =
    document.querySelector("#tab-minutes #minutes-editor") ||
    document.getElementById("minutes-editor");
  const minutesTemplates = document.getElementById("minutes-templates");
  const btnMinutesSave = document.getElementById("btn-minutes-save");
  const minutesRoot = document.getElementById("minutes-root");
  const minutesConfigOverlay = document.getElementById(
    "minutes-config-overlay"
  );
const minutesConfigForm = document.getElementById("minutes-config-form");
const btnMinutesConfigConfirm = document.getElementById(
  "minutes-config-confirm"
);
const btnMinutesConfigCancel = document.getElementById(
    "minutes-config-cancel"
  );
const btnMinutesConfigClose = document.getElementById("minutes-config-close");
const pdfDownloadBtn = document.getElementById("btn-minutes-download-pdf");
const wordDownloadBtn = document.getElementById("btn-minutes-download-word");

const isHostMinutes =
  isHost ||
  (minutesRoot && minutesRoot.dataset.isHost === "true") ||
  !!minutesConfigOverlay;

if (!minutesEditor || !minutesTemplates) {
  return;
}

  function setDownloadButtonsVisibility(visible) {
    const displayValue = visible ? "inline-flex" : "none";
    [pdfDownloadBtn, wordDownloadBtn].forEach((btn) => {
      if (!btn) return;
      btn.style.display = displayValue;
    });
  }

  const hasInitialMinutes =
    minutesEditor.dataset.hasMinutes === "true" ? true : false;
  setDownloadButtonsVisibility(hasInitialMinutes);

  /* ---------- 유틸: 현재 에디터 섹션 키 목록 ---------- */
  function getCurrentSectionKeys() {
    return Array.from(
      minutesEditor.querySelectorAll("[data-minutes-section]")
    ).map((el) => el.getAttribute("data-minutes-section"));
  }

  /* ---------- 유틸: 팝업에서 체크된 섹션 키 ---------- */
  function getSelectedKeysFromForm() {
    if (!minutesConfigForm) return [];
    return Array.from(
      minutesConfigForm.querySelectorAll('input[name="minutes_section"]:checked')
    ).map((input) => input.value);
  }

  /* ---------- 유틸: 기존 섹션 DOM ---------- */
  function findExistingSectionElement(key) {
    return minutesEditor.querySelector(`[data-minutes-section="${key}"]`);
  }

  /* ---------- 유틸: 템플릿 HTML ---------- */
  function getTemplateHtml(key) {
    const tpl = document.getElementById(`minutes-template-${key}`);
    if (!tpl) return "";
    return tpl.innerHTML.trim();
  }

  function hideMinutesEmptyMessage() {
    const emptyMsg = document.getElementById("detail-minutes-empty-msg");
    if (emptyMsg) {
      emptyMsg.style.display = "none";
    }
  }

  function syncMinutesEditboxesEditable() {
    const editBoxes = minutesEditor.querySelectorAll(".minutes-editbox");
    editBoxes.forEach((box) => {
      if (isHost) {
        box.setAttribute("contenteditable", "true");
      } else {
        box.setAttribute("contenteditable", "false");
      }
    });
  }

  /* ---------- 에디터 재구성: 체크박스 상태 → 화면 ---------- */
  function buildMinutesEditorHtml() {
    if (!isHost) return;

    const selectedKeys = getSelectedKeysFromForm();
    const htmlParts = [];

    selectedKeys.forEach((key) => {
      const existingEl = findExistingSectionElement(key);
      let bodyHtml = existingEl
        ? existingEl.innerHTML
        : getTemplateHtml(key) || "";

      htmlParts.push(
        `<div class="minutes-section" data-minutes-section="${key}">${bodyHtml}</div>`
      );
    });

    minutesEditor.innerHTML = htmlParts.join("");
    hideMinutesEmptyMessage();
    syncMinutesEditboxesEditable();
  }

  /* ---------- 저장용 HTML 생성 (base/attendees 제외) ---------- */
    function getMinutesHtmlForSaving() {
      const sectionEls = minutesEditor.querySelectorAll("[data-minutes-section]");
      const saveParts = [];

      sectionEls.forEach((el) => {
        const key = el.getAttribute("data-minutes-section");

        const cleaned = el.innerHTML
          .replace(/\n+/g, "\n")
          .replace(/[ \t]+/g, " ")
          .trim();

        
        saveParts.push(
          `<div class="minutes-section" data-minutes-section="${key}">${cleaned}</div>`
        );
      });

      return saveParts.join("");
    }

  /* ---------- 팝업 열기/닫기 ---------- */
  function openMinutesConfig() {
    if (!isHost || !minutesConfigOverlay || !minutesConfigForm) return;

    const currentKeys = new Set(getCurrentSectionKeys());

    minutesConfigForm
      .querySelectorAll('input[name="minutes_section"]')
      .forEach((input) => {
        if (currentKeys.size === 0) {
          return;
        }
        input.checked = currentKeys.has(input.value);
      });

    minutesConfigOverlay.style.display = "flex";
  }

  function closeMinutesConfig() {
    if (!minutesConfigOverlay) return;
    minutesConfigOverlay.style.display = "none";
  }

  if (isHost) {
    if (btnMinutesConfigCancel) {
      btnMinutesConfigCancel.addEventListener("click", closeMinutesConfig);
    }
    if (btnMinutesConfigClose) {
      btnMinutesConfigClose.addEventListener("click", closeMinutesConfig);
    }
    if (minutesConfigOverlay) {
      minutesConfigOverlay.addEventListener("click", (e) => {
        if (e.target === minutesConfigOverlay) {
          closeMinutesConfig();
        }
      });
    }

    if (btnMinutesConfigConfirm) {
      btnMinutesConfigConfirm.addEventListener("click", () => {
        buildMinutesEditorHtml();
        closeMinutesConfig();
      });
    }
  }

  /* ---------- 초기 렌더링 ---------- */
  function initMinutesEditor() {
    const hasAnySection =
      minutesEditor.querySelector("[data-minutes-section]") != null;

    if (!hasAnySection && isHost) {
      // host가 처음 진입 시에는 구성 선택 후 렌더링하도록 팝업을 연다.
      return;
    }
  }

  initMinutesEditor();
  syncMinutesEditboxesEditable();


  /* ---------- 회의록 저장 ---------- */
  if (btnMinutesSave) {
    btnMinutesSave.addEventListener("click", async () => {
      if (!meetingId) {
        alert("회의 ID를 찾을 수 없어 저장할 수 없습니다.");
        return;
      }
      if (!csrftoken) {
        alert("CSRF 토큰을 찾을 수 없어 저장할 수 없습니다.");
        return;
      }

      const saveHtml = getMinutesHtmlForSaving();

      try {
        const res = await fetch(`/meetings/${meetingId}/minutes/save/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken,
          },
          body: JSON.stringify({ content: saveHtml }),
        });

        if (!res.ok) {
          let msg = "회의록 저장 중 오류가 발생했습니다.";
          try {
            const data = await res.json();
            if (data.error) msg = data.error;
          } catch (_) {}
          alert(msg);
          return;
        }

        const data = await res.json();
        if (data.ok) {
          alert("회의록이 저장되었습니다.");
          hideMinutesEmptyMessage();
          minutesEditor.dataset.hasMinutes = "true";
          setDownloadButtonsVisibility(true);
        } else {
          alert("회의록 저장에 실패했습니다.");
        }
      } catch (err) {
        console.error("minutes save error:", err);
        alert("네트워크 오류로 회의록 저장에 실패했습니다.");
      }
    });
  }
});

