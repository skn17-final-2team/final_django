// static/js/meeting_detail.js
document.addEventListener("DOMContentLoaded", function () {
  // 탭 전환
  const tabButtons = document.querySelectorAll(".detail-tab");
  const tabPanels = document.querySelectorAll(".detail-tab-panel");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab-target");

      // 탭 버튼 active 토글
      tabButtons.forEach((b) => b.classList.remove("detail-tab-active"));
      btn.classList.add("detail-tab-active");

      // 패널 표시 토글
      tabPanels.forEach((panel) => {
        if (panel.getAttribute("data-tab-panel") === target) {
          panel.classList.add("detail-tab-panel-active");
        } else {
          panel.classList.remove("detail-tab-panel-active");
        }
      });
    });
  });

  // 전문 전체 복사
  const copyBtn = document.getElementById("btn-copy-full-transcript");
  const transcriptScroll = document.getElementById("detail-transcript-scroll");

  if (copyBtn && transcriptScroll) {
    copyBtn.addEventListener("click", async () => {
      const text = transcriptScroll.innerText || transcriptScroll.textContent || "";
      try {
        await navigator.clipboard.writeText(text);
        alert("전문 전체가 클립보드에 복사되었습니다.");
      } catch (e) {
        console.error("Clipboard copy failed:", e);
        alert("복사 중 오류가 발생했습니다. 브라우저 권한을 확인해 주세요.");
      }
    });
  }
});
