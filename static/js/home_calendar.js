document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("home-calendar");
  if (!calendarEl) return;

  // 오늘 날짜 기준으로 상단 텍스트 업데이트용
  const currentDateEl = document.getElementById("home-current-date");

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ko", // 한국어 요일/월 표기
    height: "auto", // 카드 높이에 맞추기
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "" // 필요시 dayGridWeek, dayGridDay 추가 가능
    },
    // 일자 클릭 시 이벤트 (일정 추가 팝업 등)
    dateClick: function (info) {
      console.log("dateClick:", info.dateStr);
      // TODO: 여기서 모달 띄우거나 일정 작성 페이지로 이동
      // alert(info.dateStr + " 클릭됨");
    },
    // 이벤트 클릭 시
    eventClick: function (info) {
      console.log("eventClick:", info.event);
      // TODO: 회의 상세 페이지로 이동 등
    },
    // 홈 화면 테스트용 이벤트 데이터
    events: [
      {
        title: "실시간/배치 파이프라인 분리 및 인증 로그 처리 방안 검토",
        start: "2025-12-18",
        allDay: true
      },
      {
        title: "연말 운영 계획 및 예산 조정 회의",
        start: "2025-12-18T09:00:00"
      }
    ]
  });

  calendar.render();

  // 캘린더가 로드된 후 현재 보이는 날짜 범위를 상단 텍스트에 맞춰주고 싶으면:
  if (currentDateEl) {
    const today = new Date();
    const formatter = new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short"
    });
    currentDateEl.textContent = formatter.format(today);
  }
});
