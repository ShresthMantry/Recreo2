import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  TextInput,
  ScrollView,
  Linking,
  Share,
  Platform,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const API_KEY = '9bf95f2bfde64fca93d63c8cbdde40e6'; // Replace with your NewsAPI key
const { width } = Dimensions.get('window');

interface Article {
  title: string;
  description: string;
  urlToImage: string;
  publishedAt: string;
  source: {
    name: string;
  };
  url: string;
}

export default function News() {
  const { theme, isDark } = useTheme();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  const categories = [
    { id: 'general', name: 'General', icon: 'globe-outline' },
    { id: 'business', name: 'Business', icon: 'briefcase-outline' },
    { id: 'technology', name: 'Tech', icon: 'hardware-chip-outline' },
    { id: 'science', name: 'Science', icon: 'flask-outline' },
    { id: 'health', name: 'Health', icon: 'fitness-outline' },
    { id: 'sports', name: 'Sports', icon: 'basketball-outline' },
    { id: 'entertainment', name: 'Entertainment', icon: 'film-outline' },
  ];

  useEffect(() => {
    startAnimation();
    fetchNews();
  }, [selectedCategory]);

  const startAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchNews = async (search?: string) => {
    try {
      setLoading(true);
      let url = search
        ? `https://newsapi.org/v2/everything?q=${search}&apiKey=${API_KEY}`
        : `https://newsapi.org/v2/top-headlines?country=us&category=${selectedCategory}&apiKey=${API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'ok') {
        setArticles(data.articles);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      fetchNews(searchQuery);
    }
  };

  const handleShare = async (article: Article) => {
    try {
      await Share.share({
        message: `${article.title}\n\nRead more: ${article.url}`,
      });
    } catch (error) {
      console.error('Error sharing article:', error);
    }
  };

  const renderArticle = ({ item }: { item: Article }) => (
    <Animated.View
      style={[
        styles.articleCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => Linking.openURL(item.url)}
        activeOpacity={0.7}
      >
        {item.urlToImage && (
          <Image
            source={{ uri: item.urlToImage }}
            style={styles.articleImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.articleContent}>
          <Text style={[styles.source, { color: theme.primary }]}>
            {item.source.name} • {new Date(item.publishedAt).toLocaleDateString()}
          </Text>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.description, { color: theme.secondaryText }]} numberOfLines={3}>
            {item.description}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.shareButton}
        onPress={() => handleShare(item)}
      >
        <Ionicons name="share-outline" size={24} color={theme.primary} />
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>News</Text>
        <TouchableOpacity
          onPress={() => setShowSearch(!showSearch)}
          style={styles.searchButton}
        >
          <Ionicons
            name={showSearch ? 'close-outline' : 'search-outline'}
            size={24}
            color={theme.text}
          />
        </TouchableOpacity>
      </View>

      {showSearch && (
        <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search news..."
            placeholderTextColor={theme.secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
        </View>
      )}

      {/* Fixed height container for categories */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContentContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                {
                  backgroundColor:
                    selectedCategory === category.id
                      ? theme.primary
                      : isDark
                      ? '#1a1a1a'
                      : '#f5f5f5',
                },
              ]}
              onPress={() => {
                setSelectedCategory(category.id);
                Haptics.selectionAsync();
              }}
            >
              <Ionicons
                name={category.icon as any}
                size={20}
                color={
                  selectedCategory === category.id
                    ? '#fff'
                    : theme.secondaryText
                }
              />
              <Text
                style={[
                  styles.categoryText,
                  {
                    color:
                      selectedCategory === category.id
                        ? '#fff'
                        : theme.secondaryText,
                  },
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={theme.primary}
        />
      ) : (
        <FlatList
          data={articles}
          renderItem={renderArticle}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.articlesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  searchButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  searchInput: {
    fontSize: 16,
    padding: 8,
  },
  categoriesWrapper: {
    height: 60, // Fixed height for the categories section
    marginBottom: 10,
  },
  categoriesContainer: {
    paddingHorizontal: 15,
  },
  categoriesContentContainer: {
    height: 50, // Fixed height for the content
    alignItems: 'center',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    height: 40, // Fixed height for each button
  },
  categoryText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  articlesList: {
    padding: 15,
  },
  articleCard: {
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  articleImage: {
    width: '100%',
    height: 200,
  },
  articleContent: {
    padding: 15,
  },
  source: {
    fontSize: 14,
    marginBottom: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  shareButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 8,
  },
});