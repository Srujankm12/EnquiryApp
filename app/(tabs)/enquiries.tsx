import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCitiesForState, STATES } from '../utils/indiaData';

const { width } = Dimensions.get('window');
const API_URL = Constants.expoConfig?.extra?.API_URL;

interface RFQ {
  id: string;
  business_id: string;
  business_name: string;
  business_phone: string;
  business_email: string;
  address: string;
  city: string;
  state: string;
  product_name: string;
  quantity: number;
  unit: string;
  price: number;
  is_rfq_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Mini Picker Modal ────────────────────────────────────────────────────────
const PickerModal = ({
  visible, title, options, selected, onSelect, onClose,
}: {
  visible: boolean; title: string; options: string[];
  selected: string; onSelect: (v: string) => void; onClose: () => void;
}) => {
  const [q, setQ] = useState('');
  const insets = useSafeAreaInsets();
  const filtered = q.trim()
    ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))
    : options;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={pm.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[pm.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={pm.handle} />
        <View style={pm.header}>
          <Text style={pm.title}>{title}</Text>
          <TouchableOpacity style={pm.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={17} color="#0F172A" />
          </TouchableOpacity>
        </View>
        {options.length > 6 && (
          <View style={pm.searchRow}>
            <Ionicons name="search-outline" size={15} color="#94A3B8" />
            <TextInput
              style={pm.searchInput}
              placeholder={`Search ${title}...`}
              placeholderTextColor="#CBD5E1"
              value={q}
              onChangeText={setQ}
              autoCorrect={false}
            />
            {q.length > 0 && (
              <TouchableOpacity onPress={() => setQ('')}>
                <Ionicons name="close-circle" size={15} color="#CBD5E1" />
              </TouchableOpacity>
            )}
          </View>
        )}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item}
          style={{ maxHeight: 360 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<View style={pm.empty}><Text style={pm.emptyTxt}>No results</Text></View>}
          renderItem={({ item }) => {
            const active = item === selected;
            return (
              <TouchableOpacity
                style={[pm.option, active && pm.optionActive]}
                onPress={() => { onSelect(item); setQ(''); onClose(); }}
              >
                <Text style={[pm.optionTxt, active && pm.optionTxtActive]}>{item}</Text>
                {active && <Ionicons name="checkmark-circle" size={16} color="#0078D7" />}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
};

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '800', color: '#0F172A' },
  closeBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F9FC', borderRadius: 12, marginHorizontal: 14, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '500' },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 13, borderRadius: 12, marginHorizontal: 8, marginVertical: 2 },
  optionActive: { backgroundColor: '#EBF5FF' },
  optionTxt: { flex: 1, fontSize: 14, color: '#334155', fontWeight: '500' },
  optionTxtActive: { color: '#0078D7', fontWeight: '700' },
  empty: { paddingVertical: 30, alignItems: 'center' },
  emptyTxt: { fontSize: 13, color: '#94A3B8' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const EnquiriesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [myBusinessId, setMyBusinessId] = useState<string | null>(null);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'closed'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // Load own business ID to exclude own RFQs
  useEffect(() => {
    const loadMyId = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        const decoded = jwtDecode<any>(token);
        const bId =
          (await AsyncStorage.getItem('companyId')) ||
          decoded.business_id ||
          null;
        setMyBusinessId(bId);
      } catch { }
    };
    loadMyId();
    fetchRFQs();
  }, []);

  useFocusEffect(useCallback(() => { fetchRFQs(false); }, []));

  useEffect(() => {
    intervalRef.current = setInterval(() => fetchRFQs(false), 30000);
    const subscription = AppState.addEventListener('change', (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active')
        fetchRFQs(false);
      appStateRef.current = next;
    });
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, []);

  const fetchRFQs = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${API_URL}/rfq/get/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.rfqs || res.data?.data?.rfqs || [];
      setRfqs(Array.isArray(data) ? data : []);
    } catch {
      if (showLoader) setRfqs([]);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRFQs(false);
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const days = Math.floor((Date.now() - date.getTime()) / 86400000);
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch { return dateStr; }
  };

  // City options derived from selected state
  const cityOptions = useMemo(
    () => getCitiesForState(filterState).map((c) => c.name),
    [filterState]
  );

  // All filter logic — excludes own business RFQs
  const filtered = useMemo(() => {
    return rfqs.filter((rfq) => {
      if (myBusinessId && rfq.business_id === myBusinessId) return false;
      if (filterActive === 'active' && !rfq.is_rfq_active) return false;
      if (filterActive === 'closed' && rfq.is_rfq_active) return false;
      if (filterState && rfq.state?.toLowerCase() !== filterState.toLowerCase()) return false;
      if (filterCity && rfq.city?.toLowerCase() !== filterCity.toLowerCase()) return false;
      if (keyword.trim()) {
        const q = keyword.toLowerCase();
        return (
          rfq.product_name?.toLowerCase().includes(q) ||
          rfq.business_name?.toLowerCase().includes(q) ||
          rfq.city?.toLowerCase().includes(q) ||
          rfq.state?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rfqs, myBusinessId, keyword, filterState, filterCity, filterActive]);

  const activeFilterCount =
    (filterState ? 1 : 0) + (filterCity ? 1 : 0) + (filterActive !== 'all' ? 1 : 0);

  // Count excluding own business RFQs (for the live badge)
  const otherCount = useMemo(
    () => rfqs.filter((r) => !myBusinessId || r.business_id !== myBusinessId).length,
    [rfqs, myBusinessId]
  );

  const clearAllFilters = () => {
    setFilterState(''); setFilterCity('');
    setFilterActive('all'); setKeyword('');
  };

  // ─── Card ────────────────────────────────────────────────────────────────────
  const renderCard = useCallback(({ item: rfq }: { item: RFQ }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/pages/rfqDetail' as any, params: { rfq_id: rfq.id } })}
    >
      {/* Status color bar */}
      <View style={[styles.cardBar, { backgroundColor: rfq.is_rfq_active ? '#0078D7' : '#94A3B8' }]} />

      <View style={styles.cardBody}>
        {/* Row 1: Icon + Product + Status */}
        <View style={styles.cardTopRow}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="cube" size={20} color="#0078D7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName} numberOfLines={1}>{rfq.product_name}</Text>
            <View style={styles.bizRow}>
              <Ionicons name="storefront-outline" size={10} color="#94A3B8" />
              <Text style={styles.bizName} numberOfLines={1}>{rfq.business_name}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: rfq.is_rfq_active ? '#DCFCE7' : '#F1F5F9' }]}>
            <View style={[styles.statusDot, { backgroundColor: rfq.is_rfq_active ? '#16A34A' : '#94A3B8' }]} />
            <Text style={[styles.statusTxt, { color: rfq.is_rfq_active ? '#16A34A' : '#94A3B8' }]}>
              {rfq.is_rfq_active ? 'Active' : 'Closed'}
            </Text>
          </View>
        </View>

        {/* Row 2: Chips */}
        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Ionicons name="layers-outline" size={11} color="#0078D7" />
            <Text style={styles.chipTxt}>{rfq.quantity} {rfq.unit}</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="pricetag-outline" size={11} color="#0078D7" />
            <Text style={styles.chipTxt}>{rfq.price > 0 ? `₹${rfq.price}` : 'On Request'}</Text>
          </View>
          {(rfq.city || rfq.state) ? (
            <View style={[styles.chip, styles.chipGrey]}>
              <Ionicons name="location-outline" size={11} color="#64748B" />
              <Text style={[styles.chipTxt, { color: '#64748B' }]} numberOfLines={1}>
                {[rfq.city, rfq.state].filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        {/* Row 3: Date + Actions */}
        <View style={styles.cardFooter}>
          <View style={styles.dateRow}>
            <Ionicons name="time-outline" size={11} color="#94A3B8" />
            <Text style={styles.dateTxt}>{formatDate(rfq.created_at)}</Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push({ pathname: '/pages/bussinesProfile' as any, params: { business_id: rfq.business_id } })}
            >
              <Ionicons name="storefront-outline" size={15} color="#0078D7" />
            </TouchableOpacity>
            {rfq.business_phone ? (
              <>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => Linking.openURL(`tel:${rfq.business_phone}`)}
                >
                  <Ionicons name="call-outline" size={15} color="#0078D7" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionWA]}
                  onPress={() => Linking.openURL(`https://wa.me/${rfq.business_phone.replace(/[^0-9]/g, '')}`)}
                >
                  <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                </TouchableOpacity>
              </>
            ) : null}
            <TouchableOpacity style={styles.actionArrow}>
              <Ionicons name="arrow-forward" size={13} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  ), []);

  // ─── Grid Card ────────────────────────────────────────────────────────────────
  const GRID_CARD_W = (width - 48) / 2;
  const renderGridCard = useCallback(({ item: rfq }: { item: RFQ }) => (
    <TouchableOpacity
      style={[styles.gridCard, { width: GRID_CARD_W }]}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/pages/rfqDetail' as any, params: { rfq_id: rfq.id } })}
    >
      <View style={[styles.gridAccent, { backgroundColor: rfq.is_rfq_active ? '#0078D7' : '#94A3B8' }]} />
      <View style={styles.gridBody}>
        {/* Icon + Status */}
        <View style={styles.gridTopRow}>
          <View style={styles.gridIconWrap}>
            <Ionicons name="receipt-outline" size={18} color="#0078D7" />
          </View>
          <View style={[styles.gridStatusBadge, { backgroundColor: rfq.is_rfq_active ? '#DCFCE7' : '#F1F5F9' }]}>
            <View style={[styles.gridStatusDot, { backgroundColor: rfq.is_rfq_active ? '#16A34A' : '#94A3B8' }]} />
          </View>
        </View>
        {/* Product name */}
        <Text style={styles.gridName} numberOfLines={2}>{rfq.product_name}</Text>
        <Text style={styles.gridBiz} numberOfLines={1}>{rfq.business_name}</Text>
        {/* Chips */}
        <View style={styles.gridChipsRow}>
          <View style={styles.gridChip}>
            <Ionicons name="layers-outline" size={9} color="#0078D7" />
            <Text style={styles.gridChipTxt}>{rfq.quantity} {rfq.unit}</Text>
          </View>
          {rfq.city ? (
            <View style={[styles.gridChip, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="location-outline" size={9} color="#64748B" />
              <Text style={[styles.gridChipTxt, { color: '#64748B' }]} numberOfLines={1}>{rfq.city}</Text>
            </View>
          ) : null}
        </View>
        {/* Price + Arrow */}
        <View style={styles.gridFooter}>
          <Text style={styles.gridPrice}>{rfq.price > 0 ? `₹${rfq.price}` : 'On Req'}</Text>
          <View style={styles.gridArrow}>
            <Ionicons name="arrow-forward" size={11} color="#fff" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  ), []);

  // ─── Filter Panel ─────────────────────────────────────────────────────────────
  const FilterPanel = () => (
    <View style={styles.filterPanel}>
      <View style={styles.filterRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.filterLabel}>STATE</Text>
          <TouchableOpacity style={styles.filterSelect} onPress={() => setShowStatePicker(true)}>
            <Text style={[styles.filterSelectTxt, !filterState && styles.dimTxt]} numberOfLines={1}>
              {filterState || 'All States'}
            </Text>
            <Ionicons name="chevron-down" size={13} color="#64748B" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.filterLabel}>CITY</Text>
          <TouchableOpacity
            style={[styles.filterSelect, !filterState && styles.filterSelectDim]}
            onPress={() => filterState && setShowCityPicker(true)}
            activeOpacity={filterState ? 0.7 : 1}
          >
            <Text style={[styles.filterSelectTxt, !filterCity && styles.dimTxt]} numberOfLines={1}>
              {filterCity || (filterState ? 'All Cities' : 'Select State first')}
            </Text>
            <Ionicons name="chevron-down" size={13} color={filterState ? '#64748B' : '#CBD5E1'} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.filterLabel}>STATUS</Text>
          <View style={styles.statusTabs}>
            {(['all', 'active', 'closed'] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.statusTab, filterActive === opt && styles.statusTabActive]}
                onPress={() => setFilterActive(opt)}
              >
                <Text style={[styles.statusTabTxt, filterActive === opt && styles.statusTabTxtActive]}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {activeFilterCount > 0 && (
        <TouchableOpacity style={styles.clearBtn} onPress={clearAllFilters}>
          <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
          <Text style={styles.clearBtnTxt}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ─── List Header ──────────────────────────────────────────────────────────────
  const ListHeader = () => (
    <View>
      {showFilters && <FilterPanel />}
      {/* Stats + Toggle */}
      <View style={styles.resultsRow}>
        <View>
          <Text style={styles.resultsTitle}>
            {keyword || activeFilterCount > 0 ? 'Filtered Results' : 'All Enquiries'}
          </Text>
          <Text style={styles.resultsCount}>
            {filtered.length} enquir{filtered.length !== 1 ? 'ies' : 'y'} found
          </Text>
        </View>
        <View style={styles.rightRow}>
          {(keyword || activeFilterCount > 0) && (
            <TouchableOpacity style={styles.clearChip} onPress={clearAllFilters}>
              <Ionicons name="close" size={12} color="#0078D7" />
              <Text style={styles.clearChipTxt}>Clear</Text>
            </TouchableOpacity>
          )}
          {/* View toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? '#0078D7' : '#94A3B8'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
              onPress={() => setViewMode('grid')}
            >
              <Ionicons name="grid-outline" size={16} color={viewMode === 'grid' ? '#0078D7' : '#94A3B8'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  // ─── Empty State ─────────────────────────────────────────────────────────────
  const ListEmpty = () => (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="document-text-outline" size={36} color="#0078D7" />
      </View>
      <Text style={styles.emptyTitle}>
        {keyword || activeFilterCount > 0 ? 'No Matching Enquiries' : 'No Enquiries Yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {keyword || activeFilterCount > 0
          ? 'Try adjusting your filters or search query'
          : 'Active buyer requests will appear here'}
      </Text>
      {keyword || activeFilterCount > 0 ? (
        <TouchableOpacity style={styles.emptyOutlineBtn} onPress={clearAllFilters}>
          <Text style={styles.emptyOutlineTxt}>Clear All Filters</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.emptyPrimaryBtn}
          onPress={() => router.push('/pages/requestQutation' as any)}
        >
          <Ionicons name="add-circle-outline" size={16} color="#fff" />
          <Text style={styles.emptyPrimaryTxt}>Create RFQ</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0060B8" />

      {/* ── HEADER ── */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.orb1} /><View style={styles.orb2} /><View style={styles.orb3} />

        <View style={styles.headerInner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>MARKETPLACE</Text>
            <Text style={styles.headerTitle}>Buyer Requests</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.liveChip}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTxt}>{otherCount} live</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrap}>
          <View style={styles.searchIconBox}>
            <Ionicons name="search-outline" size={14} color="#0078D7" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search product, business…"
            placeholderTextColor="#94A3B8"
            value={keyword}
            onChangeText={setKeyword}
          />
          {keyword.length > 0 && (
            <TouchableOpacity style={styles.searchClear} onPress={() => setKeyword('')}>
              <Ionicons name="close" size={14} color="#0078D7" />
            </TouchableOpacity>
          )}
          <View style={styles.searchDivider} />
          <TouchableOpacity
            style={[styles.filterToggle, activeFilterCount > 0 && styles.filterToggleActive]}
            onPress={() => setShowFilters((v) => !v)}
          >
            <Ionicons name="options-outline" size={15} color={activeFilterCount > 0 ? '#fff' : '#0078D7'} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeTxt}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Active filter chips */}
        {(filterState || filterCity || filterActive !== 'all') && (
          <View style={styles.activeFiltersRow}>
            {filterState && (
              <View style={styles.filterChip}>
                <Ionicons name="map-outline" size={10} color="#fff" />
                <Text style={styles.filterChipTxt}>{filterState}</Text>
                <TouchableOpacity onPress={() => { setFilterState(''); setFilterCity(''); }}>
                  <Ionicons name="close" size={10} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            {filterCity && (
              <View style={styles.filterChip}>
                <Ionicons name="location-outline" size={10} color="#fff" />
                <Text style={styles.filterChipTxt}>{filterCity}</Text>
                <TouchableOpacity onPress={() => setFilterCity('')}>
                  <Ionicons name="close" size={10} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            {filterActive !== 'all' && (
              <View style={styles.filterChip}>
                <Ionicons name="pulse-outline" size={10} color="#fff" />
                <Text style={styles.filterChipTxt}>{filterActive}</Text>
                <TouchableOpacity onPress={() => setFilterActive('all')}>
                  <Ionicons name="close" size={10} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── CONTENT ── */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#0078D7" />
            <Text style={styles.loaderTxt}>Loading enquiries…</Text>
          </View>
        </View>
      ) : (
        <FlatList
          key={viewMode}
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          renderItem={viewMode === 'grid' ? renderGridCard : renderCard}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridColumnWrapper : undefined}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<ListEmpty />}
          contentContainerStyle={[{ paddingBottom: insets.bottom + 110 }, viewMode === 'grid' && styles.gridContent]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0078D7']}
              tintColor="#0078D7"
            />
          }
        />
      )}

      {/* ── PICKERS ── */}
      <PickerModal
        visible={showStatePicker}
        title="Select State"
        options={STATES}
        selected={filterState}
        onSelect={(v) => { setFilterState(v); setFilterCity(''); }}
        onClose={() => setShowStatePicker(false)}
      />
      <PickerModal
        visible={showCityPicker}
        title="Select City"
        options={cityOptions}
        selected={filterCity}
        onSelect={setFilterCity}
        onClose={() => setShowCityPicker(false)}
      />

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => router.push('/pages/requestQutation' as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default EnquiriesScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },

  // Header
  headerWrapper: {
    backgroundColor: '#0060B8', paddingHorizontal: 20, paddingBottom: 16, overflow: 'hidden',
    shadowColor: '#003E80', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 18,
  },
  orb1: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(255,255,255,0.06)', top: -100, right: -70 },
  orb2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 10, left: -60 },
  orb3: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(100,180,255,0.08)', top: 20, right: width * 0.35 },
  headerInner: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 16 },
  eyebrow: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  liveTxt: { fontSize: 11, fontWeight: '800', color: '#fff' },
  addBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3 },

  // Search
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, height: 46, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', shadowColor: '#003E80', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  searchIconBox: { width: 27, height: 27, borderRadius: 8, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A', fontWeight: '500' },
  searchClear: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  searchDivider: { width: 1, height: 22, backgroundColor: '#E2E8F0', marginHorizontal: 8 },
  filterToggle: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center' },
  filterToggleActive: { backgroundColor: '#0078D7' },
  filterBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center' },
  filterBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },

  // Active filter chips in header
  activeFiltersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  filterChipTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Filter panel
  filterPanel: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 14, borderRadius: 20, padding: 16, shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 4, borderWidth: 1, borderColor: '#F0F4F8' },
  filterRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  filterLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 7, textTransform: 'uppercase' },
  filterSelect: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F8FAFC' },
  filterSelectTxt: { flex: 1, fontSize: 13, color: '#0F172A', fontWeight: '600' },
  filterSelectDim: { opacity: 0.5 },
  dimTxt: { color: '#CBD5E1', fontWeight: '400' },
  statusTabs: { flexDirection: 'row', gap: 6 },
  statusTab: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', alignItems: 'center' },
  statusTabActive: { backgroundColor: '#0078D7', borderColor: '#0078D7' },
  statusTabTxt: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  statusTabTxtActive: { color: '#fff' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end', marginTop: 2 },
  clearBtnTxt: { fontSize: 12, fontWeight: '700', color: '#EF4444' },

  // Results row
  resultsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },
  resultsTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', letterSpacing: -0.4 },
  resultsCount: { fontSize: 12, color: '#94A3B8', fontWeight: '500', marginTop: 2 },
  clearChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EBF5FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  clearChipTxt: { fontSize: 12, fontWeight: '700', color: '#0078D7' },

  // Card
  card: { backgroundColor: '#fff', borderRadius: 20, marginHorizontal: 16, marginBottom: 12, shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 5, borderWidth: 1, borderColor: '#F0F4F8', overflow: 'hidden' },
  cardBar: { height: 3, width: '100%' },
  cardBody: { padding: 14 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIconWrap: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center' },
  productName: { fontSize: 15, fontWeight: '800', color: '#0F172A', letterSpacing: -0.2 },
  bizRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  bizName: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 11, fontWeight: '700' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EBF5FF', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  chipGrey: { backgroundColor: '#F1F5F9' },
  chipTxt: { fontSize: 11, fontWeight: '700', color: '#0078D7' },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateTxt: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  actionBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center' },
  actionWA: { backgroundColor: '#F0FDF4' },
  actionArrow: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#0078D7', justifyContent: 'center', alignItems: 'center', shadowColor: '#0078D7', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4 },

  // Loader
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderCard: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  loaderTxt: { marginTop: 12, fontSize: 13, color: '#94A3B8', fontWeight: '500' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyPrimaryBtn: { marginTop: 24, backgroundColor: '#0078D7', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#0078D7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  emptyPrimaryTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyOutlineBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: '#0078D7' },
  emptyOutlineTxt: { color: '#0078D7', fontSize: 13, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#0078D7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0060B8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },

  // View toggle
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewToggle: { flexDirection: 'row', gap: 3, backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3 },
  viewBtn: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  viewBtnActive: { backgroundColor: '#fff', shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },

  // Grid card
  gridContent: { paddingHorizontal: 12 },
  gridColumnWrapper: { gap: 10, paddingHorizontal: 6, marginBottom: 10 },
  gridCard: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', shadowColor: '#1B4FBF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#F0F4F8' },
  gridAccent: { height: 3, width: '100%' },
  gridBody: { padding: 11 },
  gridTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  gridIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center' },
  gridStatusBadge: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  gridStatusDot: { width: 8, height: 8, borderRadius: 4 },
  gridName: { fontSize: 13, fontWeight: '800', color: '#0F172A', lineHeight: 18, marginBottom: 3 },
  gridBiz: { fontSize: 10, color: '#94A3B8', fontWeight: '500', marginBottom: 8 },
  gridChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  gridChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EBF5FF', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 20 },
  gridChipTxt: { fontSize: 9, fontWeight: '700', color: '#0078D7' },
  gridFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gridPrice: { fontSize: 13, fontWeight: '800', color: '#16A34A' },
  gridArrow: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#0078D7', justifyContent: 'center', alignItems: 'center' },
});