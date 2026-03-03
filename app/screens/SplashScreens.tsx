import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  description: string;
  image: ImageSourcePropType;
  tag: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    tag: 'DISCOVER',
    title: 'Premium Cashews & Almonds',
    description: 'Browse thousands of verified bulk listings for cashews, almonds and pistachios from trusted B2B sellers across India.',
    image: require('../../assets/splash/splash1.png'),
  },
  {
    id: '2',
    tag: 'CONNECT',
    title: 'Trade with Trusted Partners',
    description: 'Connect directly with wholesale suppliers and bulk buyers — no middlemen, just honest dry-fruit trade at the best prices.',
    image: require('../../assets/splash/splash2.png'),
  },
  {
    id: '3',
    tag: 'GROW',
    title: 'Bulk Orders Made Simple',
    description: 'Send enquiries, negotiate prices and close bulk deals for cashews, almonds, raisins and more — all in one place.',
    image: require('../../assets/splash/splash3.png'),
  },
];

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);
  const flatRef = useRef<FlatList<Slide>>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) setCurrent(viewableItems[0].index ?? 0);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const goNext = () => {
    if (current < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: current + 1, animated: true });
    } else {
      router.push('/pages/loginMail');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top bar — logo + skip */}
      <View style={styles.topBar}>
        <Image source={require('../../assets/images/icon.png')} style={styles.topLogo} resizeMode="contain" />
        <View style={styles.topBrand}>
          <Text style={styles.topBrandName}>South Canara Agro Mart</Text>
          <Text style={styles.topBrandSub}>B2B Dry Fruits Marketplace</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/pages/loginMail')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
          <Ionicons name="chevron-forward" size={13} color="#0078D7" />
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
        style={{ flex: 1 }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {/* Tag pill */}
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>{item.tag}</Text>
            </View>
            {/* Illustration */}
            <Image source={item.image} style={styles.illustration} resizeMode="contain" />
            {/* Text */}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.description}</Text>
          </View>
        )}
      />

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, current === i && styles.dotActive]} />
          ))}
        </View>

        {/* Next / Get Started */}
        <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>
            {current === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons
            name={current === SLIDES.length - 1 ? 'arrow-forward-circle' : 'arrow-forward'}
            size={18}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Sign in row */}
        {current === SLIDES.length - 1 && (
          <View style={styles.signinRow}>
            <Text style={styles.signinLabel}>Already a member? </Text>
            <TouchableOpacity onPress={() => router.push('/pages/loginMail')}>
              <Text style={styles.signinLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10,
  },
  topLogo: { width: 36, height: 36, borderRadius: 10 },
  topBrand: { flex: 1 },
  topBrandName: { fontSize: 13, fontWeight: '800', color: '#0F172A', letterSpacing: -0.1 },
  topBrandSub: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginTop: 1 },
  skipBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  skipText: { fontSize: 13, fontWeight: '700', color: '#0078D7' },

  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 20,
  },
  tagPill: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, marginBottom: 20,
  },
  tagText: { fontSize: 11, fontWeight: '800', color: '#0078D7', letterSpacing: 1.5 },
  illustration: {
    width: width * 0.78,
    height: height * 0.36,
    marginBottom: 28,
  },
  title: {
    fontSize: 23, fontWeight: '800', color: '#0F172A',
    textAlign: 'center', letterSpacing: -0.4, lineHeight: 30, marginBottom: 12,
  },
  desc: {
    fontSize: 14, color: '#64748B', textAlign: 'center',
    lineHeight: 22, fontWeight: '400',
  },

  footer: {
    paddingHorizontal: 24, paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 16 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E2E8F0' },
  dotActive: { width: 26, backgroundColor: '#0078D7' },

  nextBtn: {
    backgroundColor: '#0078D7',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, borderRadius: 16, marginBottom: 14,
    shadowColor: '#0078D7', shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  nextBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  signinRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  signinLabel: { fontSize: 13, color: '#94A3B8' },
  signinLink: { fontSize: 13, fontWeight: '800', color: '#0078D7' },
});