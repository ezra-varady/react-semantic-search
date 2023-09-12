package main

import (
	"database/sql"
	"encoding/json"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

var db *sql.DB

func init() {
	rand.Seed(time.Now().UnixNano())
}

var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")

func randSeq(n int) string {
	b := make([]rune, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

func main() {
	if err := os.MkdirAll("/tmp/lantern_semantic", os.ModePerm); err != nil {
		log.Fatal(err)
	}

	var err error
	db, err = sql.Open("postgres", "user=lantern dbname=lantern sslmode=disable password=lantern")
	if err != nil {
		log.Fatal(err)
	}

	router := mux.NewRouter()
	router.HandleFunc("/image/{id:[0-9]+}", handleImage)
	router.HandleFunc("/search/image/", handleSearchImage)
	router.HandleFunc("/search/text/", handleSearchText)

	http.ListenAndServe(":8080", router)
}

func check(err error, w http.ResponseWriter, msg string, code int) bool {
	if err != nil {
		http.Error(w, msg, code)
		return true
	}
	return false
}

func handleImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	id, ok := vars["id"]
	if !ok {
		http.Error(w, "Must include id in route", http.StatusBadRequest)
		return
	}
	idNum, err := strconv.Atoi(id)
	if check(err, w, "Error parsing id", http.StatusBadRequest) {
		return
	}

	var path string
	err = db.QueryRow("SELECT location FROM image_table WHERE id = ($1)", idNum).Scan(&path)
	if check(err, w, "Error no such ID", http.StatusInternalServerError) {
		return
	}

	// TODO mimetype inference if I have time to find/embed a better corpus
	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	http.ServeFile(w, r, path)
}

func handleSearchCommon(rows *sql.Rows, w http.ResponseWriter) {
	defer rows.Close()

	var ids []int
	var err error

	for rows.Next() {
		var id int
		err = rows.Scan(&id)
		if check(err, w, "Error querying index", http.StatusInternalServerError) {
			return
		}
		ids = append(ids, id)
	}
	if check(rows.Err(), w, "Error querying index", http.StatusInternalServerError) {
		return
	}

	data := map[string][]int{"ids": ids}
	JSONData, err := json.Marshal(data)
	if check(err, w, "Error querying index", http.StatusInternalServerError) {
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Write(JSONData)
}

func handleSearchImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 10MB max file size
	err := r.ParseMultipartForm(10 << 20)
	if check(err, w, "Error parsing form", http.StatusBadRequest) {
		return
	}

	file, fileHeader, err := r.FormFile("image")
	if check(err, w, "Error reading file", http.StatusBadRequest) {
		return
	}
	defer file.Close()

	tmpPath := filepath.Join("/tmp/lantern_semantic", randSeq(5)+fileHeader.Filename)
	tmp, err := os.Create(tmpPath)
	if check(err, w, "Error creating file", http.StatusInternalServerError) {
		return
	}
	defer tmp.Close()

	_, err = io.Copy(tmp, file)
	if check(err, w, "Error writing file", http.StatusInternalServerError) {
		return
	}

	rows, err := db.Query("SELECT id FROM image_table ORDER BY v <-> clip_image($1) ASC LIMIT 10", tmpPath)
	if check(err, w, "Error querying index", http.StatusInternalServerError) {
		return
	}

	err = os.Remove(tmpPath)
	if check(err, w, "Error removing temp file", http.StatusInternalServerError) {
		return
	}

	handleSearchCommon(rows, w)
}

func handleSearchText(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := r.FormValue("query")
	query = strings.TrimSpace(query)
	if query == "" {
		http.Error(w, "Query cannot be empty", http.StatusBadRequest)
		return
	}

	rows, err := db.Query("SELECT id FROM image_table ORDER BY v <-> clip_text($1) ASC LIMIT 10", query)
	if check(err, w, "Error querying index", http.StatusInternalServerError) {
		return
	}
	handleSearchCommon(rows, w)
}
