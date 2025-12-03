const dropzone = document.getElementById('dropzone');
const hiddenInput = document.getElementById('hidden-file');
const preview = document.getElementById('preview');
const uploadBtn = document.getElementById('upload-btn');

let selectedFiles = []; // 드래그/선택된 파일을 저장해두는 배열

// 클릭으로 파일 선택
dropzone.addEventListener('click', () => hiddenInput.click());

// 드래그 기본 동작 막기
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});

// 강조 스타일
['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, () => dropzone.classList.add('highlight'));
});
['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, () => dropzone.classList.remove('highlight'));
});

// 드롭, input 선택 처리
['drop', 'change'].forEach(eventType => {
    const target = eventType === 'drop' ? dropzone : hiddenInput;
    target.addEventListener(eventType, (e) => {
        const files = eventType === 'drop' ? e.dataTransfer.files : e.target.files;
        handleFiles(files);
    });
});

// TODO 업로드 확인창 후에 바로 S3 넘어가게 views 및 urls 수정 해야함
function handleFiles(fileList) {
    const selectedFiles = fileList[0];
    if (!selectedFiles) return;

    const ok = confirm(`${selectedFiles.name} (${Math.round(selectedFiles.size/1024)} KB)를 업로드하시겠습니까?`);
    if (!ok) {
        // 취소하면 아무 것도 안 함
        selectedFiles = [];
        preview.innerHTML = '';
        return;
    }
    preview.innerHTML = '';

    const item = document.createElement('div');
    item.textContent = `${selectedFiles.name} (${Math.round(selectedFiles.size/1024)} KB)`;
    preview.appendChild(item);
}

// 업로드 버튼 클릭 시 실행
uploadBtn.addEventListener('click', async () => {
    if (!selectedFiles) {
        alert('업로드할 파일이 없습니다');
        return;
    }

    const formData = new FormData();
    selectedFiles.forEach(f => formData.append('files', f));
    // TODO >>> meetings/upload
    const res = await fetch('meetings/upload', { 
        method: 'POST', body: formData 
    });
    if (res.ok) {
        alert('업로드 성공!');
    } else {
        alert('업로드 실패!');
    }
});