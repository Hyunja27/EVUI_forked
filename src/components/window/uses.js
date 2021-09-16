import {
  getCurrentInstance, ref, computed, reactive, watch, nextTick,
} from 'vue';

const useModel = () => {
  const { props, emit } = getCurrentInstance();

  const windowRef = ref();
  const headerRef = ref();
  const isFullExpandWindow = ref(false);
  const maximizableIcon = computed(() => (isFullExpandWindow.value ? 'ev-icon-compress' : 'ev-icon-expand'));

  // body에 #ev-window-modal div append
  let root = document.getElementById('ev-window-modal');
  const initWrapperDiv = () => {
    if (!root) {
      const rootDiv = document.createElement('div');
      rootDiv.id = 'ev-window-modal';
      document.body.appendChild(rootDiv);
      root = document.getElementById('ev-window-modal');
    }
  };

  initWrapperDiv();

  const numberToUnit = (input) => {
    let output;
    let result;

    if (typeof input === 'string' || typeof input === 'number') {
      const match = (/^(normal|(-*\d+(?:\.\d+)?)(px|%|vw|vh)?)$/).exec(input);
      output = match ? { value: +match[2], unit: match[3] || undefined } : undefined;
    } else {
      output = undefined;
    }

    if (output === null || output === undefined) {
      result = undefined;
    } else if (output.unit) {
      result = `${output.value}${output.unit}`;
    } else {
      result = `${output.value}px`;
    }

    return result;
  };

  const removeUnit = (input, direction) => {
    if (typeof input === 'number') {
      return input;
    } else if (!input) {
      return 0;
    }

    let result = 0;
    const match = (/^(normal|(\d+(?:\.\d+)?)(px|%|vw|vh)?)$/).exec(input);

    if (direction && ['%', 'vw', 'vh'].includes(match[3]) && match[2]) {
      const standard = direction === 'horizontal' ? window.innerWidth : window.innerHeight;
      result = Math.floor((standard * +match[2]) / 100);
    } else if (match[2]) {
      result = +match[2];
    }

    return result;
  };

  // set base style
  const basePosition = reactive({});
  const baseStyle = computed(() => ({
    ...props.style,
    ...basePosition,
  }));

  const setBasePosition = () => {
    if (props.fullscreen) {
      basePosition.width = '100%';
      basePosition.height = '100%';
      basePosition.top = 0;
      basePosition.left = 0;
      return;
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const refWidth = props.width ?? windowRef.value?.offsetWidth ?? Math.floor(windowWidth / 2);
    const refHeight = props.height ?? windowRef.value?.offsetHeight ?? Math.floor(windowHeight / 2);

    const tempWidth = removeUnit(refWidth, 'horizontal');
    const tempHeight = removeUnit(refHeight, 'vertical');

    basePosition.width = `${tempWidth}px`;
    basePosition.height = `${tempHeight}px`;
    basePosition.left = `${Math.floor((windowWidth - tempWidth) / 2)}px`;

    if (props.hideScroll || props.isModal) {
      basePosition.position = 'fixed';
      basePosition.top = `${Math.floor((windowHeight - tempHeight) / 2)}px`;
    } else {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        || document.body.scrollTop || 0;
      basePosition.position = 'absolute';
      basePosition.top = `${Math.floor(((windowHeight - tempHeight) / 2) + scrollTop)}px`;
    }
  };

  // close window
  const closeWin = (from) => {
    if (from === 'layer' && !props.closeOnClickModal) {
      return;
    }
    emit('update:visible', false);
  };

  // props.hideScroll === true 시, body 우측 padding & overflow hidden class 추가
  const getScrollWidth = () => window.innerWidth - document.documentElement.clientWidth;
  const changeBodyCls = (isVisible) => {
    const hideScrollWindowCnt = root?.getElementsByClassName('scroll-lock')?.length;
    const allowScrollWindowCnt = root?.getElementsByClassName('scroll-allow')?.length;
    const bodyElem = document.body;

    if (isVisible) {
      if (props.hideScroll) {
        if (!hideScrollWindowCnt) {
          const scrollWidth = getScrollWidth();
          bodyElem.style.paddingRight = `${scrollWidth}px`;
        }
        bodyElem.classList.add('ev-window-scroll-lock');
      } else if (!props.hideScroll && !props.isModal) {
        bodyElem.classList.add('ev-window-scroll-allow');
      }
    } else {
      if (hideScrollWindowCnt === 1) {
        bodyElem.style.removeProperty('padding-right');
        bodyElem.classList.remove('ev-window-scroll-lock');
      }
      if (allowScrollWindowCnt === 1) {
        bodyElem.classList.remove('ev-window-scroll-allow');
      }
    }
  };

  watch(
    () => props.visible,
    (newVal) => {
      changeBodyCls(newVal);
      if (newVal) {
        nextTick(() => {
          setBasePosition();
        });
      }
    },
  );

  return {
    windowRef,
    headerRef,
    isFullExpandWindow,
    maximizableIcon,
    baseStyle,
    closeWin,
    numberToUnit,
    removeUnit,
  };
};

const useMouseEvent = (param) => {
  const { props, emit } = getCurrentInstance();
  const {
    windowRef,
    headerRef,
    isFullExpandWindow,
    numberToUnit,
    removeUnit,
  } = param;

  const draggingMinSize = 30;
  const grabbingBorderSize = 5;
  const dragStyle = reactive({});
  const clickedInfo = reactive({
    state: '',
    pressedSpot: '',
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    clientX: 0,
    clientY: 0,
  });
  const grabbingBorderPosInfo = reactive({
    top: false,
    right: false,
    left: false,
    bottom: false,
  });
  const beforeExpandPosInfo = reactive({
    width: null,
    height: null,
    top: null,
    left: null,
  });

  const isInHeader = (x, y) => {
    if (x == null || y == null) {
      return false;
    }

    const rect = windowRef.value.getBoundingClientRect();
    const posX = +x - rect.left;
    const posY = +y - rect.top;
    const headerAreaStyleInfo = headerRef.value.style;
    const headerPaddingInfo = {
      top: removeUnit(headerAreaStyleInfo.paddingTop),
      left: removeUnit(headerAreaStyleInfo.paddingLeft),
      right: removeUnit(headerAreaStyleInfo.paddingRight),
    };
    const startPosX = headerPaddingInfo.left;
    const endPosX = rect.width - headerPaddingInfo.right;
    const startPosY = headerPaddingInfo.top;
    const endPosY = startPosY + headerRef.value.offsetHeight;

    return posX > startPosX && posX < endPosX && posY > startPosY && posY < endPosY;
  };

  const setDragStyle = (paramObj) => {
    if (paramObj === null || typeof paramObj !== 'object') {
      return;
    }

    let top;
    let left;
    let width;
    let height;
    let tMinWidth;
    let tMinHeight;
    const windowEl = windowRef.value;
    const hasOwnProperty = Object.prototype.hasOwnProperty;

    if (hasOwnProperty.call(paramObj, 'top')) {
      top = paramObj.top;
    } else {
      top = clickedInfo.top;
    }

    if (hasOwnProperty.call(paramObj, 'left')) {
      left = paramObj.left;
    } else {
      left = clickedInfo.left;
    }

    if (hasOwnProperty.call(paramObj, 'width')) {
      width = paramObj.width;
    } else {
      width = windowEl.offsetWidth;
    }

    if (hasOwnProperty.call(paramObj, 'height')) {
      height = paramObj.height;
    } else {
      height = windowEl.offsetHeight;
    }

    if (hasOwnProperty.call(paramObj, 'minWidth')) {
      tMinWidth = paramObj.minWidth;
    } else {
      tMinWidth = removeUnit(props.minWidth, 'horizontal');
    }

    if (hasOwnProperty.call(paramObj, 'minHeight')) {
      tMinHeight = paramObj.minHeight;
    } else {
      tMinHeight = removeUnit(props.minHeight, 'vertical');
    }

    width = Math.max(width, tMinWidth);
    height = Math.max(height, tMinHeight);

    dragStyle.top = numberToUnit(top);
    dragStyle.left = numberToUnit(left);
    dragStyle.width = numberToUnit(width);
    dragStyle.height = numberToUnit(height);
    dragStyle.minWidth = numberToUnit(tMinWidth);
    dragStyle.minHeight = numberToUnit(tMinHeight);
  };

  const changeMouseCursor = (e) => {
    if (!windowRef.value || clickedInfo.pressedSpot) {
      return;
    }

    if (props.resizable) {
      const rect = windowRef.value.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const top = y < grabbingBorderSize;
      const left = x < grabbingBorderSize;
      const right = x >= (rect.width - grabbingBorderSize);
      const bottom = y >= (rect.height - grabbingBorderSize);

      if ((top && left) || (bottom && right)) {
        windowRef.value.style.cursor = 'nwse-resize';
      } else if ((top && right) || (bottom && left)) {
        windowRef.value.style.cursor = 'nesw-resize';
      } else if (right || left) {
        windowRef.value.style.cursor = 'ew-resize';
      } else if (bottom || top) {
        windowRef.value.style.cursor = 'ns-resize';
      } else if (props.draggable && isInHeader(e.clientX, e.clientY)) {
        windowRef.value.style.cursor = 'move';
      } else {
        windowRef.value.style.cursor = 'default';
      }
    } else if (props.draggable && isInHeader(e.clientX, e.clientY)) {
      windowRef.value.style.cursor = 'move';
    } else {
      windowRef.value.style.cursor = 'default';
    }
  };

  // window resize
  const resizeWindow = (e) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const isTop = grabbingBorderPosInfo.top;
    const isLeft = grabbingBorderPosInfo.left;
    const isRight = grabbingBorderPosInfo.right;
    const isBottom = grabbingBorderPosInfo.bottom;
    const minWidth = removeUnit(props.minWidth, 'horizontal');
    const minHeight = removeUnit(props.minHeight, 'vertical');
    const clientX = e.clientX >= windowWidth ? windowWidth : e.clientX;
    let clientY = e.clientY >= windowHeight ? windowHeight : e.clientY;
    clientY = e.clientY > 0 ? clientY : 0;
    const diffX = clientX - clickedInfo.clientX;
    const diffY = clientY - clickedInfo.clientY;

    let top = clickedInfo.top;
    let left = clickedInfo.left;
    let width = clickedInfo.width;
    let height = clickedInfo.height;
    const maxTop = (top + clickedInfo.height) - minHeight;
    const maxLeft = (left + clickedInfo.width) - minWidth;

    if (isTop) {
      top = clickedInfo.top + diffY;
      height = clickedInfo.height - diffY;

      if (top > maxTop) {
        top = maxTop;
      }
    }

    if (isLeft) {
      left = clickedInfo.left + diffX;
      width = clickedInfo.width - diffX;

      if (left > maxLeft) {
        left = maxLeft;
      }
    }

    if (isRight) {
      width = clickedInfo.width + diffX;
    }

    if (isBottom) {
      height = clickedInfo.height + diffY;
    }

    width = Math.min(Math.max(width, minWidth), windowWidth);
    height = Math.min(Math.max(height, minHeight), windowHeight);

    const positionInfo = { top, left, width, height };
    setDragStyle(positionInfo);
    emit('resize', e, { ...positionInfo });
  };

  // mousedown > mousemove: 마우스 드래그 중
  const dragging = (e) => {
    clickedInfo.state = 'mousedown-mousemove';

    if (props.draggable && clickedInfo.pressedSpot === 'header') {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const diffTop = clickedInfo.clientY - e.clientY;
      const diffLeft = clickedInfo.clientX - e.clientX;

      let tempTop = clickedInfo.top + -diffTop;
      let tempLeft = clickedInfo.left + -diffLeft;

      if (tempTop < 0) {
        tempTop = 0;
      } else if (tempTop > windowHeight - draggingMinSize) {
        tempTop = Math.floor(windowHeight - draggingMinSize);
      }

      if (tempLeft < -(clickedInfo.width - draggingMinSize)) {
        tempLeft = -Math.floor(clickedInfo.width - draggingMinSize);
      } else if (tempLeft > windowWidth - draggingMinSize) {
        tempLeft = Math.floor(windowWidth - draggingMinSize);
      }

      setDragStyle({
        top: `${tempTop}px`,
        left: `${tempLeft}px`,
      });
    } else if (props.resizable && clickedInfo.pressedSpot === 'border') {
      resizeWindow(e);
    }

    emit('mousedown-mousemove', { ...clickedInfo });
  };

  // mousedown > mouseup: 마우스 드래그 종료
  const endDrag = (e) => {
    clickedInfo.state = '';
    clickedInfo.pressedSpot = '';

    emit('mousedown-mouseup', e);

    window.removeEventListener('mousemove', dragging);
    window.removeEventListener('mouseup', endDrag);
  };

  // mousedown: 드래그 시작
  const startDrag = (e) => {
    if (!windowRef.value || (!props.resizable && !props.draggable)) {
      return;
    }
    let pressedSpot = '';
    if (props.resizable) {
      const clientRect = windowRef.value.getBoundingClientRect();
      const x = e.clientX - clientRect.left;
      const y = e.clientY - clientRect.top;
      const isGrabTop = y < grabbingBorderSize;
      const isGrabLeft = x < grabbingBorderSize;
      const isGrabRight = x >= (clientRect.width - grabbingBorderSize);
      const isGrabBottom = y >= (clientRect.height - grabbingBorderSize);

      grabbingBorderPosInfo.top = isGrabTop;
      grabbingBorderPosInfo.left = isGrabLeft;
      grabbingBorderPosInfo.right = isGrabRight;
      grabbingBorderPosInfo.bottom = isGrabBottom;

      if (isGrabTop || isGrabLeft || isGrabRight || isGrabBottom) {
        pressedSpot = 'border';
      }
    }

    if (pressedSpot !== 'border' && isInHeader(e.clientX, e.clientY)) {
      pressedSpot = 'header';
    }

    if (!pressedSpot
      || (!props.draggable && pressedSpot === 'header')
      || (!props.resizable && pressedSpot === 'border')
    ) {
      return;
    }

    clickedInfo.state = 'mousedown';
    clickedInfo.pressedSpot = pressedSpot;
    clickedInfo.top = windowRef.value.offsetTop;
    clickedInfo.left = windowRef.value.offsetLeft;
    clickedInfo.width = windowRef.value.offsetWidth;
    clickedInfo.height = windowRef.value.offsetHeight;
    clickedInfo.clientX = e.clientX;
    clickedInfo.clientY = e.clientY;

    emit('mousedown', { ...clickedInfo });

    window.addEventListener('mousemove', dragging);
    window.addEventListener('mouseup', endDrag);
  };

  const moveMouse = (e) => {
    if (!props.draggable && !props.resizable) {
      return;
    }
    changeMouseCursor(e);
  };

  const clickExpandBtn = () => {
    isFullExpandWindow.value = !isFullExpandWindow.value;
    nextTick(() => {
      if (!isFullExpandWindow.value) {
        setDragStyle({
          top: beforeExpandPosInfo.top,
          left: beforeExpandPosInfo.left,
          width: beforeExpandPosInfo.width,
          height: beforeExpandPosInfo.height,
        });
      } else {
        beforeExpandPosInfo.top = windowRef.value.offsetTop;
        beforeExpandPosInfo.left = windowRef.value.offsetLeft;
        beforeExpandPosInfo.width = windowRef.value.offsetWidth;
        beforeExpandPosInfo.height = windowRef.value.offsetHeight;

        setDragStyle({
          top: 0,
          left: 0,
          width: document.body.clientWidth,
          height: document.body.clientHeight,
        });
      }
    });
  };

  const initWindowInfo = () => {
    isFullExpandWindow.value = false;

    clickedInfo.state = '';
    clickedInfo.pressedSpot = '';
    clickedInfo.top = 0;
    clickedInfo.left = 0;
    clickedInfo.width = 0;
    clickedInfo.height = 0;
    clickedInfo.clientX = 0;
    clickedInfo.clientY = 0;

    grabbingBorderPosInfo.top = false;
    grabbingBorderPosInfo.left = false;
    grabbingBorderPosInfo.right = false;
    grabbingBorderPosInfo.bottom = false;

    beforeExpandPosInfo.top = null;
    beforeExpandPosInfo.left = null;
    beforeExpandPosInfo.width = null;
    beforeExpandPosInfo.height = null;

    Object.keys(dragStyle).forEach((key) => {
      delete dragStyle[key];
    });
  };

  watch(
    () => props.visible,
    (newVal) => {
      if (!newVal) {
        initWindowInfo();
      }
    },
  );

  return {
    dragStyle,
    startDrag,
    moveMouse,
    clickExpandBtn,
  };
};

export {
  useModel,
  useMouseEvent,
};