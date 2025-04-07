import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ScrollView,
  Linking // Add this import
} from "react-native";
import axios from "axios";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

const GOOGLE_BOOKS_API_KEY = "AIzaSyAORif4JskaLIcWPwVHIEcZ2u-Y3vm6LWs";
const { width } = Dimensions.get('window');

// Type definitions
interface BookVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    publisher?: string;
    publishedDate?: string;
    averageRating?: number;
    ratingsCount?: number;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    previewLink?: string; // Add this field for external link
  };
  saleInfo?: {
    listPrice?: {
      amount: number;
      currencyCode: string;
    };
  };
}

interface BookDetailsProps {
  book: BookVolume;
  onClose: () => void;
}

export default function Books() {
  const [books, setBooks] = useState<BookVolume[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("fiction");
  const [selectedCategory, setSelectedCategory] = useState<string>("fiction");
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<BookVolume | null>(null);
  const { theme, isDark } = useTheme();

  const categories: string[] = [
    "fiction", 
    "mystery", 
    "science fiction", 
    "fantasy", 
    "romance", 
    "biography"
  ];

  const fetchBooks = async (searchTerm: string): Promise<void> => {
    setLoading(true);
    try {
      // Add a random parameter to get different results each time
      const randomParam = `&startIndex=${Math.floor(Math.random() * 40)}`;
      const response = await axios.get<{items?: BookVolume[]}>(
        `https://www.googleapis.com/books/v1/volumes?q=${searchTerm}&maxResults=15${randomParam}&key=${GOOGLE_BOOKS_API_KEY}`
      );
      setBooks(response.data.items || []);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks(query);
  }, []);

  const handleCategoryPress = (category: string): void => {
    setSelectedCategory(category);
    setQuery(category);
    fetchBooks(category);
  };

  const handleSearch = (): void => {
    fetchBooks(query);
  };

  const handleBookPress = (book: BookVolume): void => {
    setSelectedBook(book);
    setModalVisible(true);
  };

  // Update the BookVolume interface to include previewLink
  interface BookVolume {
    id: string;
    volumeInfo: {
      title: string;
      authors?: string[];
      description?: string;
      publisher?: string;
      publishedDate?: string;
      averageRating?: number;
      ratingsCount?: number;
      imageLinks?: {
        thumbnail?: string;
        smallThumbnail?: string;
      };
    };
    saleInfo?: {
      listPrice?: {
        amount: number;
        currencyCode: string;
      };
    };
  }

  // Add a link button to the book details modal
  const BookDetails: React.FC<BookDetailsProps> = ({ book, onClose }) => (
    <View style={styles.modalContainer}>
      <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
        <TouchableOpacity 
          style={[styles.closeButton, { backgroundColor: theme.surfaceHover }]} 
          onPress={onClose}
        >
          <Text style={[styles.closeButtonText, { color: theme.text }]}>✕</Text>
        </TouchableOpacity>
        
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalScrollContent}
        >
          <Image 
            source={{ 
              uri: book.volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/128x192?text=No+Cover' 
            }}
            style={styles.modalCover}
          />
          
          <Text style={[styles.modalTitle, { color: theme.text }]}>{book.volumeInfo.title}</Text>
          
          {book.volumeInfo.authors && (
            <Text style={[styles.modalAuthor, { color: theme.secondaryText }]}>
              by {book.volumeInfo.authors.join(", ")}
            </Text>
          )}
          
          <View style={styles.detailsRow}>
            {book.volumeInfo.publisher && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.secondaryText }]}>Publisher</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{book.volumeInfo.publisher}</Text>
              </View>
            )}
            
            {book.volumeInfo.publishedDate && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.secondaryText }]}>Published</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{book.volumeInfo.publishedDate}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.ratingContainer}>
            {book.volumeInfo.averageRating && (
              <View style={[styles.ratingBadge, { backgroundColor: isDark ? '#3d2e00' : '#fff8e1' }]}>
                <Text style={styles.rating}>
                  ★ {book.volumeInfo.averageRating.toFixed(1)}
                  {book.volumeInfo.ratingsCount && ` (${book.volumeInfo.ratingsCount})`}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.descriptionContainer}>
            <Text style={[styles.descriptionTitle, { color: theme.text }]}>Description</Text>
            <Text style={[styles.description, { color: theme.secondaryText }]}>
              {book.volumeInfo.description || "No description available."}
            </Text>
          </View>
          
          {book.saleInfo?.listPrice && (
            <View style={[styles.priceTag, { backgroundColor: isDark ? '#1a3320' : '#e8f5e9' }]}>
              <Text style={styles.price}>
                {book.saleInfo.listPrice.currencyCode === 'INR' ? '₹' : book.saleInfo.listPrice.currencyCode} {book.saleInfo.listPrice.amount}
              </Text>
            </View>
          )}

          {/* Add a button to open the book's preview link */}
          {book.volumeInfo.previewLink && (
            <TouchableOpacity
              style={[styles.viewMoreButton, { backgroundColor: theme.primary }]}
              onPress={() => Linking.openURL(book.volumeInfo.previewLink || '')}
            >
              <Ionicons name="book-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.viewMoreButtonText}>View on Google Books</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>Discover Books</Text>
        
        <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground }]}>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search books..."
            placeholderTextColor={theme.secondaryText}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity 
            style={[styles.searchButton, { backgroundColor: theme.primary }]} 
            onPress={handleSearch}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.categoriesContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  { backgroundColor: isDark ? theme.surfaceHover : "#f0f0f0" },
                  selectedCategory === item && { backgroundColor: theme.primary },
                ]}
                onPress={() => handleCategoryPress(item)}
              >
                <Text 
                  style={[
                    styles.categoryText,
                    { color: theme.secondaryText },
                    selectedCategory === item && { color: "#fff" },
                  ]}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Loading books...</Text>
          </View>
        ) : (
          <FlatList
            data={books}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.booksList}
            columnWrapperStyle={styles.booksRow}
            showsVerticalScrollIndicator={true}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.bookItem, { backgroundColor: theme.cardBackground }]}
                onPress={() => handleBookPress(item)}
              >
                <Image
                  source={{ 
                    uri: item.volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/128x192?text=No+Cover' 
                  }}
                  style={styles.bookCover}
                />
                <View style={styles.bookInfo}>
                  <Text style={[styles.bookTitle, { color: theme.text }]} numberOfLines={2}>
                    {item.volumeInfo.title}
                  </Text>
                  <Text style={[styles.bookAuthor, { color: theme.secondaryText }]} numberOfLines={1}>
                    {item.volumeInfo.authors?.join(", ") || "Unknown Author"}
                  </Text>
                  <View style={styles.bookFooter}>
                    {item.volumeInfo.averageRating && (
                      <View style={[styles.bookRatingContainer, { backgroundColor: isDark ? '#3d2e00' : '#fff8e1' }]}>
                        <Text style={styles.bookRating}>
                          ★ {item.volumeInfo.averageRating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                    {item.volumeInfo.previewLink && (
                      <TouchableOpacity
                        style={styles.bookLinkButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          Linking.openURL(item.volumeInfo.previewLink || '');
                        }}
                      >
                        <Text style={[styles.bookLinkText, { color: theme.primary }]}>View</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No books found for "{query}"</Text>
                <TouchableOpacity 
                  style={[styles.tryAgainButton, { backgroundColor: theme.primary }]}
                  onPress={() => fetchBooks("fiction")}
                >
                  <Text style={styles.tryAgainText}>Try Popular Books</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
        
        {modalVisible && selectedBook && (
          <BookDetails 
            book={selectedBook} 
            onClose={() => setModalVisible(false)} 
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// Add these styles at the end of the StyleSheet
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingBottom: require('react-native').Platform.OS === 'android' ? 80 : 0,
    paddingTop: require('react-native').Platform.OS === 'android' ? 40 : 0,
  },
  title: { 
    fontSize: 32, 
    marginBottom: 20, 
    textAlign: "center",
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  searchContainer: {
    flexDirection: "row",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderRadius: 12,
    padding: 4,
  },
  searchInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  searchButton: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    borderRadius: 10,
    marginLeft: 8,
  },
  searchButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 25,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  categoryText: {
    fontWeight: "500",
    fontSize: 15,
  },
  booksList: {
    paddingBottom: 20,
  },
  booksRow: {
    justifyContent: "space-between",
  },
  bookItem: {
    width: (width - 48) / 2,
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  bookCover: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  bookInfo: {
    padding: 14,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
    lineHeight: 22,
  },
  bookAuthor: {
    fontSize: 14,
    marginBottom: 8,
  },
  bookRatingContainer: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bookRating: {
    fontSize: 14,
    color: "#ff9800",
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 18,
    marginBottom: 20,
  },
  tryAgainButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  tryAgainText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  modalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  modalContent: {
    width: "90%",
    maxHeight: "85%",
    borderRadius: 20,
    padding: 24,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalScrollContent: {
    alignItems: "center",
    paddingBottom: 20,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1000,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  modalCover: {
    width: 180,
    height: 270,
    borderRadius: 12,
    marginBottom: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  modalAuthor: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  detailItem: {
    alignItems: "center",
    padding: 10,
  },
  detailLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  ratingContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  ratingBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rating: {
    fontSize: 18,
    color: "#ff9800",
    fontWeight: "bold",
  },
  descriptionContainer: {
    marginBottom: 24,
    width: "100%",
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  priceTag: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 10,
  },
  price: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4caf50",
  },
  viewMoreButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignSelf: 'center',
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'auto',
  },
  viewMoreButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});