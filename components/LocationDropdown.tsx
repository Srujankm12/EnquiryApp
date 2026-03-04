import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface DropdownOption {
    label: string;
    value: string;
}

interface LocationDropdownProps {
    label: string;
    placeholder?: string;
    value: string;
    options: DropdownOption[];
    onSelect: (value: string) => void;
    icon?: keyof typeof Ionicons.glyphMap;
    error?: string;
    disabled?: boolean;
    /** Style variant — 'card' (white bg) or 'flat' (grey bg, default) */
    variant?: "card" | "flat";
}

const LocationDropdown: React.FC<LocationDropdownProps> = ({
    label,
    placeholder,
    value,
    options,
    onSelect,
    icon = "chevron-down-outline",
    error,
    disabled = false,
    variant = "flat",
}) => {
    const [visible, setVisible] = useState(false);
    const [search, setSearch] = useState("");
    const insets = useSafeAreaInsets();

    const filtered = useMemo(() => {
        if (!search.trim()) return options;
        return options.filter((o) =>
            o.label.toLowerCase().includes(search.toLowerCase())
        );
    }, [options, search]);

    const selectedLabel = options.find((o) => o.value === value)?.label || value;

    const handleOpen = () => {
        if (!disabled) {
            setSearch("");
            setVisible(true);
        }
    };

    const handleSelect = (opt: DropdownOption) => {
        onSelect(opt.value);
        setVisible(false);
        setSearch("");
    };

    const isFlat = variant === "flat";

    return (
        <>
            {/* Trigger */}
            <View style={styles.group}>
                <Text style={isFlat ? styles.labelFlat : styles.labelCard}>{label}</Text>
                <TouchableOpacity
                    style={[
                        isFlat ? styles.triggerFlat : styles.triggerCard,
                        !!error && styles.triggerError,
                        disabled && styles.triggerDisabled,
                    ]}
                    onPress={handleOpen}
                    activeOpacity={0.7}
                >
                    <Text
                        style={[
                            isFlat ? styles.triggerTextFlat : styles.triggerTextCard,
                            !value && styles.placeholderText,
                        ]}
                        numberOfLines={1}
                    >
                        {value ? selectedLabel : (placeholder || `Select ${label}`)}
                    </Text>
                    <Ionicons
                        name={visible ? "chevron-up-outline" : "chevron-down-outline"}
                        size={16}
                        color={disabled ? "#CBD5E1" : "#64748B"}
                    />
                </TouchableOpacity>
                {!!error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            {/* Modal */}
            <Modal
                visible={visible}
                transparent
                animationType="slide"
                onRequestClose={() => setVisible(false)}
                statusBarTranslucent
            >
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={() => setVisible(false)}
                />
                <View
                    style={[
                        styles.sheet,
                        { paddingBottom: Platform.OS === "ios" ? insets.bottom + 8 : 16 },
                    ]}
                >
                    {/* Handle */}
                    <View style={styles.handle} />

                    {/* Header */}
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>{label}</Text>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => setVisible(false)}
                        >
                            <Ionicons name="close" size={18} color="#0F172A" />
                        </TouchableOpacity>
                    </View>

                    {/* Search */}
                    {options.length > 6 && (
                        <View style={styles.searchWrap}>
                            <Ionicons name="search-outline" size={16} color="#94A3B8" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder={`Search ${label}...`}
                                placeholderTextColor="#CBD5E1"
                                value={search}
                                onChangeText={setSearch}
                                autoCorrect={false}
                            />
                            {search.length > 0 && (
                                <TouchableOpacity onPress={() => setSearch("")}>
                                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* List */}
                    <FlatList
                        data={filtered}
                        keyExtractor={(item) => item.value}
                        style={styles.list}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Ionicons name="search-outline" size={32} color="#CBD5E1" />
                                <Text style={styles.emptyText}>No results found</Text>
                            </View>
                        }
                        renderItem={({ item }) => {
                            const selected = item.value === value;
                            return (
                                <TouchableOpacity
                                    style={[styles.option, selected && styles.optionSelected]}
                                    onPress={() => handleSelect(item)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                                        {item.label}
                                    </Text>
                                    {selected && (
                                        <Ionicons name="checkmark-circle" size={18} color="#0078D7" />
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    group: { marginBottom: 14 },

    // Flat variant (used in CompanyBasicInfoStep)
    labelFlat: {
        fontSize: 12,
        fontWeight: "700",
        color: "#374151",
        marginBottom: 7,
        marginTop: 14,
        textTransform: "uppercase",
        letterSpacing: 0.2,
    },
    triggerFlat: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
        backgroundColor: "#F8FAFC",
    },
    triggerTextFlat: {
        flex: 1,
        fontSize: 15,
        color: "#0F172A",
        fontWeight: "500",
    },

    // Card variant (used in EditBusinessDetailsScreen)
    labelCard: {
        fontSize: 10,
        fontWeight: "700",
        color: "#94A3B8",
        marginBottom: 8,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
    triggerCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F7F9FC",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingHorizontal: 12,
        paddingVertical: 13,
    },
    triggerTextCard: {
        flex: 1,
        fontSize: 14,
        color: "#0F172A",
        fontWeight: "600",
    },

    // Shared
    placeholderText: { color: "#CBD5E1", fontWeight: "400" },
    triggerError: { borderColor: "#EF4444", backgroundColor: "#FFF5F5" },
    triggerDisabled: { opacity: 0.5 },
    errorText: { fontSize: 11, color: "#EF4444", fontWeight: "600", marginTop: 4 },

    // Modal
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "75%",
        minHeight: 300,
        paddingTop: 12,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: "#E2E8F0",
        borderRadius: 2,
        alignSelf: "center",
        marginBottom: 16,
    },
    sheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
        marginBottom: 8,
    },
    sheetTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: "800",
        color: "#0F172A",
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
    },
    searchWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F7F9FC",
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: "#0F172A",
        fontWeight: "500",
        paddingVertical: 0,
    },
    list: { flex: 1, paddingHorizontal: 8 },
    option: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 12,
        marginHorizontal: 4,
        marginVertical: 2,
    },
    optionSelected: { backgroundColor: "#EBF5FF" },
    optionText: { flex: 1, fontSize: 15, color: "#334155", fontWeight: "500" },
    optionTextSelected: { color: "#0078D7", fontWeight: "700" },
    empty: { paddingVertical: 40, alignItems: "center", gap: 10 },
    emptyText: { fontSize: 13, color: "#94A3B8", fontWeight: "500" },
});

export default LocationDropdown;
