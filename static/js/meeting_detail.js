document.addEventListener("DOMContentLoaded", () => {
  const meetingDetailRoot = document.getElementById("meeting-detail-root");
  if (!meetingDetailRoot) return;

  const meetingId = meetingDetailRoot.dataset.meetingId || "";
  const csrfInput = document.getElementById("csrf-token");
  const csrftoken = csrfInput ? csrfInput.value : "";

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
    btnAudioDownload.addEventListener("click", async () => {
      try {
        // 음성 파일 다운로드 API 호출
        const response = await fetch(`/meetings/${meetingId}/audio/download/`, {
          method: 'GET',
          headers: {
            'X-CSRFToken': csrftoken,
          },
        });

        if (!response.ok) {
          throw new Error('음성 파일 다운로드에 실패했습니다.');
        }

        // Blob으로 변환
        const blob = await response.blob();

        // 파일명 추출 (Content-Disposition 헤더에서)
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'meeting_audio.wav';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
          }
        }

        // 다운로드 링크 생성 및 클릭
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // 정리
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        console.error('Audio download error:', err);
        alert(err.message || '음성 파일 다운로드 중 오류가 발생했습니다.');
      }
    });
  }

  /* =========================================
   * 4. 태스크 저장 (Who/What/When)
   * ========================================= */
  const taskSaveBtn = document.getElementById("btn-tasks-save");
  if (taskSaveBtn && meetingId) {
    taskSaveBtn.addEventListener("click", async () => {
      const rows = Array.from(document.querySelectorAll(".detail-task-row"));
      const tasksPayload = [];

      rows.forEach((row) => {
        const who = (row.querySelector('[data-task-field="who"]')?.value || "").trim();
        const what = (row.querySelector('[data-task-field="what"]')?.value || "").trim();
        const when = (row.querySelector('[data-task-field="when"]')?.value || "").trim();
        if (!who && !what && !when) return;

        const taskData = { who, what, when };
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
  const whoOptions = Array.from(
    document.querySelectorAll("#task-who-options option")
  ).map((opt) => opt.value || "");

  // 태스크 추가 버튼(상단)으로 빈 행 추가
  const taskAddMainBtn = document.getElementById("btn-tasks-add-main");
  function addTaskRow() {
    const body = document.querySelector(".detail-task-body");
    if (!body) return;
    const newRow = document.createElement("div");
    newRow.className = "detail-task-row";
    newRow.innerHTML = `
      <div class="detail-task-col detail-task-col-who">
        <div class="task-who-wrapper">
          <input type="text" class="task-edit-field task-who-input" data-task-field="who" list="task-who-options" />
          <button type="button" class="task-who-toggle" aria-label="who 목록 열기">&#9662;</button>
        </div>
      </div>
      <div class="detail-task-col detail-task-col-what">
        <textarea class="task-edit-field" data-task-field="what" rows="2"></textarea>
      </div>
      <div class="detail-task-col detail-task-col-when">
        <textarea class="task-edit-field" data-task-field="when" rows="2"></textarea>
      </div>
    `;
    body.appendChild(newRow);
    const newWrapper = newRow.querySelector(".task-who-wrapper");
    if (newWrapper) {
      bindWhoDropdown(newWrapper);
    }
    const firstInput = newRow.querySelector(".task-who-input");
    if (firstInput) {
      firstInput.focus();
    }
    body.scrollTop = body.scrollHeight;
  }
  if (taskAddMainBtn) {
    taskAddMainBtn.addEventListener("click", addTaskRow);
  }

  function bindWhoDropdown(wrapper) {
    const input = wrapper.querySelector(".task-who-input");
    const toggle = wrapper.querySelector(".task-who-toggle");
    if (!input || !toggle) return;

    wrapper.style.position = "relative";

    const dropdown = document.createElement("div");
    dropdown.className = "task-who-dropdown";
    dropdown.style.display = "none";
    wrapper.appendChild(dropdown);

    const renderList = (keyword = "") => {
      dropdown.innerHTML = "";
      const lower = keyword.toLowerCase();
      const filtered = whoOptions.filter((v) => v.toLowerCase().includes(lower));
      if (!filtered.length) {
        // 항상 전체 목록을 보여주기 위해 필터가 비면 전체 표시
        whoOptions.forEach((val) => {
          const item = document.createElement("div");
          item.className = "task-who-dropdown-item";
          item.textContent = val;
          item.addEventListener("click", () => {
            input.value = val;
            dropdown.style.display = "none";
          });
          dropdown.appendChild(item);
        });
        return;
      }
      filtered.forEach((val) => {
        const item = document.createElement("div");
        item.className = "task-who-dropdown-item";
        item.textContent = val;
        item.addEventListener("click", () => {
          input.value = val;
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

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dropdown.style.display === "block") {
        hide();
      } else {
        input.focus();
        show();
      }
    });

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

  document.querySelectorAll(".detail-task-add-btn").forEach(attachTaskAddHandler);

  // 기존 행에도 커스텀 드롭다운 바인딩
  document.querySelectorAll(".task-who-wrapper").forEach(bindWhoDropdown);

  // 태스크 추가 버튼(상단)
  function addTaskRow() {
    const body = document.querySelector(".detail-task-body");
    if (!body) return;
    const newRow = document.createElement("div");
    newRow.className = "detail-task-row";
    newRow.innerHTML = `
      <div class="detail-task-col detail-task-col-who">
        <div class="task-who-wrapper">
          <input type="text" class="task-edit-field task-who-input" data-task-field="who" list="task-who-options" />
          <button type="button" class="task-who-toggle" aria-label="who 목록 열기">&#9662;</button>
        </div>
      </div>
      <div class="detail-task-col detail-task-col-what">
        <textarea class="task-edit-field" data-task-field="what" rows="2"></textarea>
      </div>
      <div class="detail-task-col detail-task-col-when">
        <textarea class="task-edit-field" data-task-field="when" rows="2"></textarea>
      </div>
    `;
    body.appendChild(newRow);
    const newWrapper = newRow.querySelector(".task-who-wrapper");
    if (newWrapper) {
      bindWhoDropdown(newWrapper);
    }
  }
  if (taskAddMainBtn) {
    taskAddMainBtn.addEventListener("click", addTaskRow);
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

  const isHost =
    (meetingDetailRoot.dataset.isHost || "") === "true" ||
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

