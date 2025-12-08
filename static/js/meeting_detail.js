// static/js/meeting_detail.js
document.addEventListener("DOMContentLoaded", function () {
  // ========== 1. 탭 전환 ==========
  const tabButtons = document.querySelectorAll(".detail-tab");
  const tabPanels = document.querySelectorAll(".detail-tab-panel");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab-target");

      tabButtons.forEach((b) => b.classList.remove("detail-tab-active"));
      btn.classList.add("detail-tab-active");

      tabPanels.forEach((panel) => {
        if (panel.getAttribute("data-tab-panel") === target) {
          panel.classList.add("detail-tab-panel-active");
        } else {
          panel.classList.remove("detail-tab-panel-active");
        }
      });
    });
  });

  // ========== 2. 전문 전체 복사 (기존 기능 유지) ==========
  const copyBtn = document.getElementById("btn-copy-full-transcript");
  const transcriptScroll = document.getElementById("detail-transcript-scroll");

  if (copyBtn && transcriptScroll) {
    copyBtn.addEventListener("click", async () => {
      const text =
        transcriptScroll.innerText || transcriptScroll.textContent || "";
      try {
        await navigator.clipboard.writeText(text);
        alert("전문 전체가 클립보드에 복사되었습니다.");
      } catch (e) {
        console.error("Clipboard copy failed:", e);
        alert("복사 중 오류가 발생했습니다. 브라우저 권한을 확인해 주세요.");
      }
    });
  }

  // ========== 3. 회의 정보 팝업 (이미 사용 중이면 유지, 없으면 자동 무시) ==========
  const infoOverlay = document.getElementById("meeting-info-overlay");
  const infoToggleBtn = document.getElementById("meeting-info-toggle");
  const infoCloseBtn = document.getElementById("meeting-info-close");

  if (infoOverlay && infoToggleBtn) {
    function openInfoOverlay() {
      infoOverlay.classList.add("is-open");
      infoToggleBtn.setAttribute("aria-expanded", "true");
    }

    function closeInfoOverlay() {
      infoOverlay.classList.remove("is-open");
      infoToggleBtn.setAttribute("aria-expanded", "false");
    }

    infoToggleBtn.addEventListener("click", function () {
      const isOpen = infoOverlay.classList.contains("is-open");
      isOpen ? closeInfoOverlay() : openInfoOverlay();
    });

    if (infoCloseBtn) {
      infoCloseBtn.addEventListener("click", closeInfoOverlay);
    }

    infoOverlay.addEventListener("click", function (e) {
      if (e.target === infoOverlay) {
        closeInfoOverlay();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && infoOverlay.classList.contains("is-open")) {
        closeInfoOverlay();
      }
    });
  }

  // ========== 4. 회의록 저장 ==========
  const root = document.getElementById("meeting-detail-root");
  const minutesEditor = document.getElementById("minutes-editor");
  const minutesSaveBtn = document.getElementById("btn-minutes-save");

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
  }

  if (root && minutesEditor && minutesSaveBtn) {
    const meetingId = root.dataset.meetingId;

    minutesSaveBtn.addEventListener("click", async () => {
      const html = minutesEditor.innerHTML;
      const csrftoken = getCookie("csrftoken");

      try {
        const res = await fetch(`/meetings/${meetingId}/minutes/save/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken || "",
          },
          body: JSON.stringify({ content: html }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const msg = data.error || "회의록 저장 중 오류가 발생했습니다.";
          alert(msg);
          return;
        }

        alert("회의록이 저장되었습니다.");
      } catch (err) {
        console.error("minutes save error:", err);
        alert("네트워크 오류로 회의록 저장에 실패했습니다.");
      }
    });
  }
});
