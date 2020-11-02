import {
  ref, reactive, computed, watch,
  onMounted, onBeforeUnmount,
  nextTick, getCurrentInstance,
} from 'vue';

export const useModel = () => {
  const { props, emit } = getCurrentInstance();

  /**
   * Select 컴포넌트의 v-model 값
   * single 모드 : modelValue(String), 없는 경우 null
   * multiple 모드 : modelValue(Array), 없는 경우 []
   */
  const singleMv = {
    get: () => {
      if (props.items.some(v => v.value === props.modelValue)) {
        return props.modelValue;
      }
      return null;
    },
    set: value => emit('update:modelValue', value),
  };
  const multiMv = {
    get: () => {
      if (Array.isArray(props.modelValue)) {
        return props.modelValue;
      }
      return [];
    },
    set: value => emit('update:modelValue', value),
  };
  const mv = computed(!props.multiple ? singleMv : multiMv);

  /**
   * 현재 select에서 선택된 항목들
   * single 모드 : { name: 'name', value: 'value' }
   * multiple 모드 : [{ name: 'name', value: 'value' }, {...}]
   */
  const singleSm = () => props.items.find(v => v.value === mv.value)?.name;
  const multipleSm = () => props.items.filter(v => props.modelValue.includes(v.value));
  const selectedModel = computed(!props.multiple ? singleSm : multipleSm);

  const computedPlaceholder = computed(() => {
    if (!props.multiple) {
      return props.placeholder;
    }
    return mv.value.length ? null : props.placeholder;
  });

  /**
   * clearable 모드일 때, 항목(mv) 전체 삭제 아이콘 존재여부
   */
  const singleIci = () => mv.value;
  const multipleIci = () => mv.value.length;
  const isClearableIcon = computed(!props.multiple ? singleIci : multipleIci);

  /**
   * clearable모드일 때 [x] 아이콘 클릭 시 mv값을 초기화
   */
  const removeAllMv = () => { mv.value = !props.multiple ? null : []; };

  /**
   * multiple 모드인 경우 선택된 value를 mv에서 삭제하는 로직
   * @param val - tagWrapper에서 [x]클릭된 목록의 value
   */
  const removeMv = (val) => {
    if (!props.disabled) {
      const idx = mv.value.indexOf(val);
      mv.value.splice(idx, 1);
    }
  };

  /**
   * 해당 컴포넌트의 v-model값이 변경(change)되는 이벤트
   * @param e
   */
  const changeMv = async (e) => {
    await nextTick();
    emit('change', mv.value, e);
  };

  return {
    mv,
    selectedModel,
    computedPlaceholder,
    isClearableIcon,
    removeAllMv,
    removeMv,
    changeMv,
  };
};

export const useDropdown = (param) => {
  const { props } = getCurrentInstance();
  const mv = param.mv;

  const isDropbox = ref(false);
  const filterTextRef = ref(props.filterText);

  /**
   * filterable 모드 시 인풋박스에 입력된 텍스트가 포함된 목록 가져오기
   * @param val - filterable 모드 시 인풋박스에 입력된 텍스트
   * @returns [] - 필터링 결과의 목록
   */
  const filteredItems = computed(() => {
    if (!filterTextRef.value || !props.filterable) {
      return props.items;
    }
    const trimText = filterTextRef.value?.trim();
    return props.items.filter(v => v.name.toUpperCase().includes(trimText.toUpperCase())) || [];
  });

  /**
   * 인풋박스 클릭 이벤트
   * props로 받는 항목이 없는 경우 return처리
   * 인풋박스 위 클릭된 이벤트위치로 드롭박스의 사이즈, 위치를 계산
   */
  const clickSelectInput = () => {
    if (props.items.length && !props.disabled) {
      isDropbox.value = !isDropbox.value;
    }
  };

  /**
   * 드롭박스 외부 클릭 이벤트
   * filterable 모드인 경우는 필터링텍스트를 비운다.
   */
  const clickOutsideDropbox = () => {
    if (props.filterable) {
      filterTextRef.value = '';
    }
    isDropbox.value = false;
  };

  /**
   * 항목 클릭하여 선택하는 이벤트
   * 항목 내 disabled인 경우 클릭 로직을 타지 않게 한다.
   * multiple 모드가 아닌경우 리스트 클릭 시 드롭박스를 닫는다.
   * @param val - clicked item value
   */
  const singleClickItem = (val) => {
    mv.value = val;
    isDropbox.value = false;
  };
  const multipleClickItem = (val) => {
    if (!mv.value.includes(val)) {
      mv.value.push(val);
    } else {
      const idx = mv.value.indexOf(val);
      mv.value.splice(idx, 1);
    }
  };
  const clickItem = !props.multiple ? singleClickItem : multipleClickItem;

  /**
   * 선택된 아이템을 구별하는 메소드
   * @param val
   * @returns {boolean | array}
   */
  const singleSelectedCls = val => val === mv.value;
  const multipleSelectedCls = val => mv.value.includes(val);
  const selectedItemClass = !props.multiple ? singleSelectedCls : multipleSelectedCls;

  return {
    isDropbox,
    filterTextRef,
    filteredItems,
    clickSelectInput,
    clickOutsideDropbox,
    clickItem,
    selectedItemClass,
  };
};

export const usePosition = (param) => {
  const { props } = getCurrentInstance();
  const isDropbox = param.isDropbox;
  const selectedModel = param.selectedModel;

  const select = ref(null);
  const itemWrapper = ref(null);
  const dropboxPosition = reactive({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });

  /**
   * dropdown box가 나타날 때의 position style
   */
  const dropdownStyle = computed(() => ({
    top: `${dropboxPosition.top}px`,
    left: `${dropboxPosition.left}px`,
    width: `${dropboxPosition.width}px`,
  }));

  /**
   * 해당 컴포넌트 setup() 초기에 modal을 body에 append함.
   * dropdown의 teleport to=":id"의 DOM을 미리 구성하기 위함.
   */
  const createDropdownEl = () => {
    const DROPDOWN_CLS = 'ev-select-dropdown-modal';
    const targetEl = document.getElementById(DROPDOWN_CLS);
    if (!document.body.contains(targetEl)) {
      const dropdownEl = document.createElement('div');
      dropdownEl.setAttribute('id', DROPDOWN_CLS);
      document.body.appendChild(dropdownEl);
    }
  };

  /**
   * dropdown box 위치 변경하는 메소드
   */
  const changeDropboxPosition = () => {
    if (isDropbox.value) {
      const selectRect = select.value.getBoundingClientRect();
      dropboxPosition.top = window.pageYOffset + selectRect.top + selectRect.height;
      dropboxPosition.left = window.pageXOffset + selectRect.left;
      dropboxPosition.width = selectRect.width;
    }
  };

  /**
   * dropdown box 내 선택한 첫번째 아이템을 스크롤 가장 위로 올리는 메소드
   */
  const scrollToSelectedItem = () => {
    if (!itemWrapper.value?.children[0]?.children?.length) {
      return;
    }
    const SELECTED_CLS = 'selected';
    const childEls = itemWrapper.value.children[0].children;
    const wrapperOffsetTop = itemWrapper.value.offsetTop;
    let childEl = null;
    for (let i = 0; i < childEls.length; i++) {
      childEl = childEls[i];
      if (childEl.classList.contains(SELECTED_CLS)) {
        if (!childEl.offsetTop) {
          return;
        }
        itemWrapper.value.scrollTop = childEl.offsetTop - wrapperOffsetTop;
        break;
      }
    }
  };

  /**
   * dropdown box의 위치를 감지하는 메소드
   * 마운트, 비포마운트 훅에서 resize이벤트로 드랍다운박스의 포지션을 변경함
   * multiple에서 선택된 아이템이 변경 시 selectRef의 높이가 변경될 수 있으므로 이를 감시함
   */
  const observeDropbox = () => {
    onMounted(() => {
      window.addEventListener('resize', changeDropboxPosition);
    });
    onBeforeUnmount(() => {
      window.removeEventListener('resize', changeDropboxPosition);
    });

    watch(
      () => isDropbox.value,
      (cur) => {
        if (cur) {
          changeDropboxPosition();
          scrollToSelectedItem();
        }
      },
    );

    if (props.multiple) {
      watch(
        () => selectedModel.value,
        () => changeDropboxPosition(),
      );
    }
  };

  return {
    select,
    itemWrapper,
    dropdownStyle,
    createDropdownEl,
    observeDropbox,
  };
};